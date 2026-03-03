package ast

import (
	"fmt"
	"strings"
)

type MysqlCompiler struct{}

func (c *MysqlCompiler) formatType(col ColumnDefinition) string {
	baseType := strings.ToLower(col.Type)
	if col.Length != nil {
		if l, ok := col.Length.(float64); ok && l > 0 {
			return fmt.Sprintf("%s(%d)", baseType, int(l))
		}
		if l, ok := col.Length.(string); ok && l != "" {
			return fmt.Sprintf("%s(%s)", baseType, l)
		}
	}
	if col.Precision != nil {
		if col.Scale != nil {
			return fmt.Sprintf("%v(%v,%v)", baseType, col.Precision, col.Scale)
		}
		return fmt.Sprintf("%v(%v)", baseType, col.Precision)
	}
	if baseType == "varchar" && (col.Length == nil || col.Length == 0) {
		return "varchar(255)"
	}
	return baseType
}

func (c *MysqlCompiler) formatDefault(col ColumnDefinition) string {
	if col.DefaultValue == nil {
		return ""
	}
	val := *col.DefaultValue
	if col.IsDefaultExpression {
		return fmt.Sprintf("DEFAULT %s", val)
	}
	return fmt.Sprintf("DEFAULT '%s'", strings.ReplaceAll(val, "'", "''"))
}

func (c *MysqlCompiler) formatNullable(col ColumnDefinition) string {
	if col.Nullable {
		return "NULL"
	}
	return "NOT NULL"
}

func (c *MysqlCompiler) formatComment(col ColumnDefinition) string {
	if col.Comment == "" {
		return ""
	}
	return fmt.Sprintf("COMMENT '%s'", strings.ReplaceAll(col.Comment, "'", "''"))
}

func (c *MysqlCompiler) GenerateAlterTableSql(req DiffRequest) []string {
	var sqls []string
	safeTable := fmt.Sprintf("`%s`", req.TableName)

	oldPredecessor := make(map[string]string)
	allOldCols := make([]ColumnDefinition, 0)
	for _, col := range req.Columns {
		if col.Original != nil {
			allOldCols = append(allOldCols, *col.Original)
		}
	}
	for _, col := range req.DeletedColumns {
		if col.Original != nil {
			allOldCols = append(allOldCols, *col.Original)
		} else {
			allOldCols = append(allOldCols, col)
		}
	}
	// Sort by OriginalIndex
	for i := 0; i < len(allOldCols); i++ {
		for j := i + 1; j < len(allOldCols); j++ {
			if allOldCols[i].OriginalIndex > allOldCols[j].OriginalIndex {
				allOldCols[i], allOldCols[j] = allOldCols[j], allOldCols[i]
			}
		}
	}
	for i, col := range allOldCols {
		if i > 0 {
			oldPredecessor[col.Name] = allOldCols[i-1].Name
		} else {
			oldPredecessor[col.Name] = ""
		}
	}

	if req.OldTableName != "" && req.OldTableName != req.TableName {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE `%s` RENAME TO `%s`;", req.OldTableName, req.TableName))
	}
	for _, col := range req.DeletedColumns {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP COLUMN `%s`;", safeTable, col.Name))
	}

	for i, col := range req.Columns {
		position := ""
		if i == 0 {
			position = "FIRST"
		} else {
			position = fmt.Sprintf("AFTER `%s`", req.Columns[i-1].Name)
		}

		colType := c.formatType(col)
		if col.Original == nil {
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD COLUMN `%s` %s %s %s %s %s;",
				safeTable, col.Name, colType, c.formatNullable(col), c.formatDefault(col), c.formatComment(col), position))
		} else {
			origType := c.formatType(*col.Original)
			propChanged := col.Name != col.Original.Name || colType != origType || col.Nullable != col.Original.Nullable ||
				col.Comment != col.Original.Comment || (col.DefaultValue == nil) != (col.Original.DefaultValue == nil) ||
				(col.DefaultValue != nil && *col.DefaultValue != *col.Original.DefaultValue)

			actualPrev := ""
			if i > 0 {
				actualPrev = req.Columns[i-1].Name
			}
			posChanged := actualPrev != oldPredecessor[col.Original.Name]

			if propChanged || posChanged {
				sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s CHANGE `%s` `%s` %s %s %s %s %s;",
					safeTable, col.Original.Name, col.Name, colType, c.formatNullable(col), c.formatDefault(col), c.formatComment(col), position))
			}
		}
	}
	return sqls
}

func (c *MysqlCompiler) GenerateCreateTableSql(req DiffRequest) []string {
	var colDefs []string
	var pkCols []string
	for _, col := range req.Columns {
		autoInc := ""
		if col.IsAutoIncrement {
			autoInc = "AUTO_INCREMENT"
		}
		colDefs = append(colDefs, fmt.Sprintf("`%s` %s %s %s %s %s", col.Name, c.formatType(col), c.formatNullable(col), c.formatDefault(col), autoInc, c.formatComment(col)))
		if col.IsPrimaryKey {
			pkCols = append(pkCols, fmt.Sprintf("`%s`", col.Name))
		}
	}
	if len(pkCols) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
	}
	sql := fmt.Sprintf("CREATE TABLE `%s` (\n  %s\n);", req.TableName, strings.Join(colDefs, ",\n  "))
	return []string{sql}
}
