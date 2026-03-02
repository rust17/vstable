package ast

import (
	"fmt"
	"strings"
)

// PGCompiler implements PostgreSQL dialect SQL generation
type PGCompiler struct{}

func (c *PGCompiler) formatType(col ColumnDefinition) string {
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

	return baseType
}

func (c *PGCompiler) formatDefault(col ColumnDefinition) string {
	if col.DefaultValue == nil {
		return ""
	}
	val := *col.DefaultValue
	if col.IsDefaultExpression {
		return fmt.Sprintf("DEFAULT %s", val)
	}
	// Simple escaping for strings
	return fmt.Sprintf("DEFAULT '%s'", strings.ReplaceAll(val, "'", "''"))
}

func (c *PGCompiler) GenerateAlterTableSql(req DiffRequest) []string {
	var sqls []string
	safeSchema := fmt.Sprintf("\"%s\"", req.Schema)
	safeTable := fmt.Sprintf("\"%s\"", req.TableName)
	fullTableName := fmt.Sprintf("%s.%s", safeSchema, safeTable)

	if req.OldTableName != "" && req.OldTableName != req.TableName {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s.\"%s\" RENAME TO \"%s\";", safeSchema, req.OldTableName, req.TableName))
	}

	for _, col := range req.DeletedColumns {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP COLUMN \"%s\";", fullTableName, col.Name))
	}

	for _, col := range req.Columns {
		colType := c.formatType(col)
		if col.Original == nil {
			// New column
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD COLUMN \"%s\" %s %s %s;", 
				fullTableName, col.Name, colType, c.formatNullable(col), c.formatDefault(col)))
			if col.Comment != "" {
				sqls = append(sqls, fmt.Sprintf("COMMENT ON COLUMN %s.\"%s\" IS '%s';", fullTableName, col.Name, strings.ReplaceAll(col.Comment, "'", "''")))
			}
		} else {
			if col.Name != col.Original.Name {
				sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s RENAME COLUMN \"%s\" TO \"%s\";", 
					fullTableName, col.Original.Name, col.Name))
			}
			if colType != c.formatType(*col.Original) {
				sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" TYPE %s;", fullTableName, col.Name, colType))
			}
			if col.Nullable != col.Original.Nullable {
				if col.Nullable {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" DROP NOT NULL;", fullTableName, col.Name))
				} else {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" SET NOT NULL;", fullTableName, col.Name))
				}
			}
			// Default change
			if (col.DefaultValue == nil) != (col.Original.DefaultValue == nil) || (col.DefaultValue != nil && *col.DefaultValue != *col.Original.DefaultValue) {
				if col.DefaultValue == nil {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" DROP DEFAULT;", fullTableName, col.Name))
				} else {
					def := c.formatDefault(col)
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" SET %s;", fullTableName, col.Name, def))
				}
			}
			// Comment change
			if col.Comment != col.Original.Comment {
				sqls = append(sqls, fmt.Sprintf("COMMENT ON COLUMN %s.\"%s\" IS '%s';", fullTableName, col.Name, strings.ReplaceAll(col.Comment, "'", "''")))
			}
		}
	}
	return sqls
}

func (c *PGCompiler) formatNullable(col ColumnDefinition) string {
	if col.Nullable { return "NULL" }
	return "NOT NULL"
}

func (c *PGCompiler) GenerateCreateTableSql(req DiffRequest) []string {
	var colDefs []string
	var comments []string
	var pkCols []string
	safeTable := fmt.Sprintf("\"%s\".\"%s\"", req.Schema, req.TableName)
	
	for _, col := range req.Columns {
		colDefs = append(colDefs, fmt.Sprintf("\"%s\" %s %s %s", col.Name, c.formatType(col), c.formatNullable(col), c.formatDefault(col)))
		if col.Comment != "" {
			comments = append(comments, fmt.Sprintf("COMMENT ON COLUMN %s.\"%s\" IS '%s';", safeTable, col.Name, strings.ReplaceAll(col.Comment, "'", "''")))
		}
		if col.IsPrimaryKey {
			pkCols = append(pkCols, fmt.Sprintf("\"%s\"", col.Name))
		}
	}
	
	if len(pkCols) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
	}
	
	sql := fmt.Sprintf("CREATE TABLE %s (\n  %s\n);", safeTable, strings.Join(colDefs, ",\n  "))
	res := []string{sql}
	res = append(res, comments...)
	return res
}
