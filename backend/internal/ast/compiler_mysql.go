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

func (c *MysqlCompiler) GenerateCreateTableSql(req DiffRequest) []string {
	var colDefs []string
	var pkCols []string
	safeTable := fmt.Sprintf("`%s`", req.TableName)

	for _, col := range req.Columns {
		autoInc := ""
		if col.IsAutoIncrement {
			autoInc = "AUTO_INCREMENT"
		}
		colDefs = append(colDefs, strings.TrimSpace(fmt.Sprintf("`%s` %s %s %s %s %s", col.Name, c.formatType(col), c.formatNullable(col), c.formatDefault(col), autoInc, c.formatComment(col))))
		if col.IsPrimaryKey {
			pkCols = append(pkCols, fmt.Sprintf("`%s`", col.Name))
		}
	}
	if len(pkCols) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
	}

	for _, idx := range req.Indexes {
		uniqueStr := ""
		if idx.IsUnique {
			uniqueStr = "UNIQUE "
		}
		var cols []string
		for _, col := range idx.Columns {
			cols = append(cols, fmt.Sprintf("`%s`", col))
		}
		colDefs = append(colDefs, fmt.Sprintf("%sKEY `%s` (%s)", uniqueStr, idx.Name, strings.Join(cols, ", ")))
	}

	engine := "InnoDB"
	charset := "utf8mb4"
	collation := "utf8mb4_unicode_ci"
	if req.Config != nil {
		if req.Config.Engine != "" {
			engine = req.Config.Engine
		}
		if req.Config.Charset != "" {
			charset = req.Config.Charset
		}
		if req.Config.Collation != "" {
			collation = req.Config.Collation
		}
	}

	sql := fmt.Sprintf("CREATE TABLE %s (\n  %s\n) ENGINE=%s DEFAULT CHARSET=%s COLLATE=%s;", safeTable, strings.Join(colDefs, ",\n  "), engine, charset, collation)
	return []string{sql}
}

func (c *MysqlCompiler) GenerateDropTableSql(req DiffRequest) []string {
	return []string{fmt.Sprintf("DROP TABLE IF EXISTS `%s`;", req.TableName)}
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
		sqls = append(sqls, fmt.Sprintf("RENAME TABLE `%s` TO `%s`;", req.OldTableName, req.TableName))
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
			sqls = append(sqls, strings.TrimSpace(fmt.Sprintf("ALTER TABLE %s ADD COLUMN `%s` %s %s %s %s %s;",
				safeTable, col.Name, colType, c.formatNullable(col), c.formatDefault(col), c.formatComment(col), position)))
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
				sqls = append(sqls, strings.TrimSpace(fmt.Sprintf("ALTER TABLE %s CHANGE COLUMN `%s` `%s` %s %s %s %s %s;",
					safeTable, col.Original.Name, col.Name, colType, c.formatNullable(col), c.formatDefault(col), c.formatComment(col), position)))
			}
		}
	}

	// Foreign Keys
	for _, fk := range req.DeletedForeignKeys {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP FOREIGN KEY `%s`;", safeTable, fk.Name))
	}
	for _, fk := range req.ForeignKeys {
		if fk.Original == nil {
			var cols, refCols []string
			for _, c := range fk.Columns {
				cols = append(cols, fmt.Sprintf("`%s`", c))
			}
			for _, c := range fk.ReferencedColumns {
				refCols = append(refCols, fmt.Sprintf("`%s`", c))
			}
			onDel := ""
			if fk.OnDelete != "" {
				onDel = " ON DELETE " + fk.OnDelete
			}
			onUpd := ""
			if fk.OnUpdate != "" {
				onUpd = " ON UPDATE " + fk.OnUpdate
			}
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT `%s` FOREIGN KEY (%s) REFERENCES `%s` (%s)%s%s;",
				safeTable, fk.Name, strings.Join(cols, ", "), fk.ReferencedTable, strings.Join(refCols, ", "), onDel, onUpd))
		}
	}

	// Check Constraints (MySQL >= 8.0)
	for _, chk := range req.DeletedChecks {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP CHECK `%s`;", safeTable, chk.Name))
	}
	for _, chk := range req.CheckConstraints {
		if chk.Original == nil {
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT `%s` CHECK (%s);", safeTable, chk.Name, chk.Expression))
		}
	}

	// Indexes
	for _, idx := range req.DeletedIndexes {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP INDEX `%s`;", safeTable, idx.Name))
	}
	for _, idx := range req.Indexes {
		if idx.Original == nil {
			uniqueStr := ""
			if idx.IsUnique {
				uniqueStr = "UNIQUE "
			}
			var cols []string
			for _, col := range idx.Columns {
				cols = append(cols, fmt.Sprintf("`%s`", col))
			}
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD %sINDEX `%s` (%s);", safeTable, uniqueStr, idx.Name, strings.Join(cols, ", ")))
		}
	}

	// Config
	if req.Config != nil {
		var configOpts []string
		if req.Config.Engine != "" {
			configOpts = append(configOpts, "ENGINE="+req.Config.Engine)
		}
		if req.Config.Charset != "" {
			configOpts = append(configOpts, "DEFAULT CHARSET="+req.Config.Charset)
		}
		if req.Config.Collation != "" {
			configOpts = append(configOpts, "COLLATE="+req.Config.Collation)
		}
		if req.Config.AutoIncrementOffset > 0 {
			configOpts = append(configOpts, fmt.Sprintf("AUTO_INCREMENT=%d", req.Config.AutoIncrementOffset))
		}
		if len(configOpts) > 0 {
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s %s;", safeTable, strings.Join(configOpts, " ")))
		}
	}

	return sqls
}

func (c *MysqlCompiler) GenerateCreateViewSql(req DiffRequest) []string {
	var sqls []string
	for _, view := range req.Views {
		if view.Original == nil || view.Definition != view.Original.Definition {
			sqls = append(sqls, fmt.Sprintf("CREATE OR REPLACE VIEW `%s` AS %s;", view.Name, view.Definition))
		}
	}
	return sqls
}

func (c *MysqlCompiler) GenerateDropViewSql(req DiffRequest) []string {
	var sqls []string
	for _, view := range req.DeletedViews {
		sqls = append(sqls, fmt.Sprintf("DROP VIEW IF EXISTS `%s`;", view.Name))
	}
	return sqls
}

func (c *MysqlCompiler) GenerateCreateTriggerSql(req DiffRequest) []string {
	var sqls []string
	for _, trig := range req.Triggers {
		if trig.Original == nil || trig.Definition != trig.Original.Definition {
			if trig.Original != nil {
				sqls = append(sqls, fmt.Sprintf("DROP TRIGGER IF EXISTS `%s`;", trig.Name))
			}
			sqls = append(sqls, fmt.Sprintf("CREATE TRIGGER `%s` %s %s ON `%s` FOR EACH ROW %s", trig.Name, trig.Timing, trig.Event, trig.TableName, trig.Definition))
		}
	}
	return sqls
}

func (c *MysqlCompiler) GenerateDropTriggerSql(req DiffRequest) []string {
	var sqls []string
	for _, trig := range req.DeletedTriggers {
		sqls = append(sqls, fmt.Sprintf("DROP TRIGGER IF EXISTS `%s`;", trig.Name))
	}
	return sqls
}

func (c *MysqlCompiler) GenerateCreateRoutineSql(req DiffRequest) []string {
	var sqls []string
	for _, rout := range req.Routines {
		if rout.Original == nil || rout.Definition != rout.Original.Definition {
			if rout.Original != nil {
				sqls = append(sqls, fmt.Sprintf("DROP %s IF EXISTS `%s`;", rout.Type, rout.Name))
			}
			// Routine definition should include CREATE PROCEDURE/FUNCTION...
			sqls = append(sqls, rout.Definition)
		}
	}
	return sqls
}

func (c *MysqlCompiler) GenerateDropRoutineSql(req DiffRequest) []string {
	var sqls []string
	for _, rout := range req.DeletedRoutines {
		sqls = append(sqls, fmt.Sprintf("DROP %s IF EXISTS `%s`;", rout.Type, rout.Name))
	}
	return sqls
}
