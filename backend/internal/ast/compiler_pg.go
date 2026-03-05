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
	return fmt.Sprintf("DEFAULT '%s'", strings.ReplaceAll(val, "'", "''"))
}

func (c *PGCompiler) formatTableName(schema, table string) string {
	if schema != "" {
		return fmt.Sprintf("\"%s\".\"%s\"", schema, table)
	}
	return fmt.Sprintf("\"%s\"", table)
}

func (c *PGCompiler) formatNullable(col ColumnDefinition) string {
	if col.Nullable {
		return "NULL"
	}
	return "NOT NULL"
}

func (c *PGCompiler) GenerateCreateTableSql(req DiffRequest) []string {
	var colDefs []string
	var comments []string
	var pkCols []string
	fullTableName := c.formatTableName(req.Schema, req.TableName)

	for _, col := range req.Columns {
		colDefs = append(colDefs, strings.TrimSpace(fmt.Sprintf("\"%s\" %s %s %s", col.Name, c.formatType(col), c.formatNullable(col), c.formatDefault(col))))
		if col.Comment != "" {
			comments = append(comments, fmt.Sprintf("COMMENT ON COLUMN %s.\"%s\" IS '%s';", fullTableName, col.Name, strings.ReplaceAll(col.Comment, "'", "''")))
		}
		if col.IsPrimaryKey {
			pkCols = append(pkCols, fmt.Sprintf("\"%s\"", col.Name))
		}
	}

	if len(pkCols) > 0 {
		colDefs = append(colDefs, fmt.Sprintf("PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
	}

	sql := fmt.Sprintf("CREATE TABLE %s (\n  %s\n);", fullTableName, strings.Join(colDefs, ",\n  "))
	res := []string{sql}
	res = append(res, comments...)

	// Create Indexes
	for _, idx := range req.Indexes {
		uniqueStr := ""
		if idx.IsUnique {
			uniqueStr = "UNIQUE "
		}
		var cols []string
		for _, c := range idx.Columns {
			cols = append(cols, fmt.Sprintf("\"%s\"", c))
		}
		res = append(res, fmt.Sprintf("CREATE %sINDEX \"%s\" ON %s (%s);", uniqueStr, idx.Name, fullTableName, strings.Join(cols, ", ")))
	}
	return res
}

func (c *PGCompiler) GenerateDropTableSql(req DiffRequest) []string {
	fullTableName := c.formatTableName(req.Schema, req.TableName)
	return []string{fmt.Sprintf("DROP TABLE IF EXISTS %s CASCADE;", fullTableName)}
}

func (c *PGCompiler) GenerateAlterTableSql(req DiffRequest) []string {
	var sqls []string
	fullTableName := c.formatTableName(req.Schema, req.TableName)

	if req.OldTableName != "" && req.OldTableName != req.TableName {
		oldTableName := c.formatTableName(req.Schema, req.OldTableName)
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s RENAME TO \"%s\";", oldTableName, req.TableName))
	}

	for _, col := range req.DeletedColumns {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP COLUMN \"%s\";", fullTableName, col.Name))
	}

	for _, col := range req.Columns {
		colType := c.formatType(col)
		if col.Original == nil {
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
				sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" TYPE %s USING \"%s\"::%s;", fullTableName, col.Name, colType, col.Name, colType))
			}
			if col.Nullable != col.Original.Nullable {
				if col.Nullable {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" DROP NOT NULL;", fullTableName, col.Name))
				} else {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" SET NOT NULL;", fullTableName, col.Name))
				}
			}
			if (col.DefaultValue == nil) != (col.Original.DefaultValue == nil) || (col.DefaultValue != nil && *col.DefaultValue != *col.Original.DefaultValue) {
				if col.DefaultValue == nil {
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" DROP DEFAULT;", fullTableName, col.Name))
				} else {
					def := c.formatDefault(col)
					sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN \"%s\" SET %s;", fullTableName, col.Name, def))
				}
			}
			if col.Comment != col.Original.Comment {
				sqls = append(sqls, fmt.Sprintf("COMMENT ON COLUMN %s.\"%s\" IS '%s';", fullTableName, col.Name, strings.ReplaceAll(col.Comment, "'", "''")))
			}
		}
	}

	// Constraints
	for _, fk := range req.DeletedForeignKeys {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT \"%s\";", fullTableName, fk.Name))
	}
	for _, fk := range req.ForeignKeys {
		if fk.Original == nil {
			var cols, refCols []string
			for _, c := range fk.Columns {
				cols = append(cols, fmt.Sprintf("\"%s\"", c))
			}
			for _, c := range fk.ReferencedColumns {
				refCols = append(refCols, fmt.Sprintf("\"%s\"", c))
			}
			onDel := ""
			if fk.OnDelete != "" {
				onDel = " ON DELETE " + fk.OnDelete
			}
			onUpd := ""
			if fk.OnUpdate != "" {
				onUpd = " ON UPDATE " + fk.OnUpdate
			}
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT \"%s\" FOREIGN KEY (%s) REFERENCES %s (%s)%s%s;",
				fullTableName, fk.Name, strings.Join(cols, ", "), c.formatTableName(req.Schema, fk.ReferencedTable), strings.Join(refCols, ", "), onDel, onUpd))
		}
	}

	for _, chk := range req.DeletedChecks {
		sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s DROP CONSTRAINT \"%s\";", fullTableName, chk.Name))
	}
	for _, chk := range req.CheckConstraints {
		if chk.Original == nil {
			sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s ADD CONSTRAINT \"%s\" CHECK (%s);", fullTableName, chk.Name, chk.Expression))
		}
	}

	// Indexes
	for _, idx := range req.DeletedIndexes {
		idxName := idx.Name
		schemaPrefix := ""
		if req.Schema != "" {
			schemaPrefix = fmt.Sprintf("\"%s\".", req.Schema)
		}
		sqls = append(sqls, fmt.Sprintf("DROP INDEX %s\"%s\";", schemaPrefix, idxName))
	}
	for _, idx := range req.Indexes {
		if idx.Original == nil {
			uniqueStr := ""
			if idx.IsUnique {
				uniqueStr = "UNIQUE "
			}
			var cols []string
			for _, col := range idx.Columns {
				cols = append(cols, fmt.Sprintf("\"%s\"", col))
			}
			sqls = append(sqls, fmt.Sprintf("CREATE %sINDEX \"%s\" ON %s (%s);", uniqueStr, idx.Name, fullTableName, strings.Join(cols, ", ")))
		}
	}
	return sqls
}

func (c *PGCompiler) GenerateCreateViewSql(req DiffRequest) []string {
	var sqls []string
	for _, view := range req.Views {
		if view.Original == nil || view.Definition != view.Original.Definition {
			sqls = append(sqls, fmt.Sprintf("CREATE OR REPLACE VIEW %s AS %s;", c.formatTableName(req.Schema, view.Name), view.Definition))
		}
	}
	return sqls
}

func (c *PGCompiler) GenerateDropViewSql(req DiffRequest) []string {
	var sqls []string
	for _, view := range req.DeletedViews {
		sqls = append(sqls, fmt.Sprintf("DROP VIEW IF EXISTS %s;", c.formatTableName(req.Schema, view.Name)))
	}
	return sqls
}

func (c *PGCompiler) GenerateCreateTriggerSql(req DiffRequest) []string {
	var sqls []string
	for _, trig := range req.Triggers {
		if trig.Original == nil {
			sqls = append(sqls, fmt.Sprintf("CREATE TRIGGER \"%s\" %s %s ON %s %s;", trig.Name, trig.Timing, trig.Event, c.formatTableName(req.Schema, trig.TableName), trig.Definition))
		} else {
			if trig.Enabled != trig.Original.Enabled {
				state := "ENABLE"
				if !trig.Enabled {
					state = "DISABLE"
				}
				sqls = append(sqls, fmt.Sprintf("ALTER TABLE %s %s TRIGGER \"%s\";", c.formatTableName(req.Schema, trig.TableName), state, trig.Name))
			}
		}
	}
	return sqls
}

func (c *PGCompiler) GenerateDropTriggerSql(req DiffRequest) []string {
	var sqls []string
	for _, trig := range req.DeletedTriggers {
		sqls = append(sqls, fmt.Sprintf("DROP TRIGGER IF EXISTS \"%s\" ON %s;", trig.Name, c.formatTableName(req.Schema, trig.TableName)))
	}
	return sqls
}

func (c *PGCompiler) GenerateCreateRoutineSql(req DiffRequest) []string {
	var sqls []string
	for _, rout := range req.Routines {
		if rout.Original == nil || rout.Definition != rout.Original.Definition {
			sqls = append(sqls, rout.Definition) // For PG, Definition usually contains full CREATE OR REPLACE FUNCTION ...
		}
	}
	return sqls
}

func (c *PGCompiler) GenerateDropRoutineSql(req DiffRequest) []string {
	var sqls []string
	for _, rout := range req.DeletedRoutines {
		// Basic drop, requires parameter types in real PG, simplified here for testing.
		sqls = append(sqls, fmt.Sprintf("DROP %s IF EXISTS \"%s\";", rout.Type, rout.Name))
	}
	return sqls
}
