package ast

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"
	"vstable-engine/internal/db"
)

func TestPostgresSyncIntegration(t *testing.T) {
	dsn := os.Getenv("PG_DSN")
	if dsn == "" {
		dsn = "postgres://root:password@localhost:5433/vstable_test?sslmode=disable"
	}

	dialect := "pg"
	compiler := &PGCompiler{}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	dbManager := db.NewManager()
	err := dbManager.Connect(ctx, "test-session", dialect, dsn)
	if err != nil {
		t.Fatalf("[%s] Connection failed: %v", dialect, err)
	}
	defer dbManager.Disconnect("test-session")
	driver, _ := dbManager.Get("test-session")

	tableName := fmt.Sprintf("sync_test_%s", dialect)
	refTableName := fmt.Sprintf("ref_test_%s", dialect)
	viewName := fmt.Sprintf("view_test_%s", dialect)
	schema := "public"

	// 1. Cleanup
	cleanup := []string{
		fmt.Sprintf("DROP VIEW IF EXISTS %s.%s CASCADE;", schema, viewName),
		fmt.Sprintf("DROP TABLE IF EXISTS %s.%s CASCADE;", schema, tableName),
		fmt.Sprintf("DROP TABLE IF EXISTS %s.%s CASCADE;", schema, refTableName),
		fmt.Sprintf("DROP FUNCTION IF EXISTS test_func();"),
		fmt.Sprintf("DROP FUNCTION IF EXISTS test_func2();"),
	}

	for _, sql := range cleanup {
		driver.Query(ctx, sql, nil)
	}

	// 2. CREATE Reference Table (for FK)
	refReq := DiffRequest{
		Dialect:   dialect,
		Schema:    schema,
		TableName: refTableName,
		Columns: []ColumnDefinition{
			{ID: "r1", Name: "id", Type: "int", Nullable: false, IsPrimaryKey: true, OriginalIndex: 0},
		},
	}
	for _, sql := range compiler.GenerateCreateTableSql(refReq) {
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Fatalf("[%s] Create ref table failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	// 3. CREATE Main Table
	defActive := "active"
	createReq := DiffRequest{
		Dialect:   dialect,
		Schema:    schema,
		TableName: tableName,
		Columns: []ColumnDefinition{
			{ID: "c1", Name: "id", Type: "int", Nullable: false, IsPrimaryKey: true, OriginalIndex: 0},
			{ID: "c2", Name: "name", Type: "varchar", Length: 100.0, Nullable: false, OriginalIndex: 1, Comment: "Initial NOT NULL"},
			{ID: "c3", Name: "status", Type: "varchar", Length: 20.0, Nullable: true, OriginalIndex: 2, DefaultValue: &defActive},
		},
	}
	for _, sql := range compiler.GenerateCreateTableSql(createReq) {
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Fatalf("[%s] Create table failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	// 4. ALTER TABLE: Add Column, Change Column, Rename Column, Drop Column, FK, Check, Index
	alterReq := DiffRequest{
		Dialect:      dialect,
		Schema:       schema,
		TableName:    tableName,
		OldTableName: tableName,
		Columns: []ColumnDefinition{
			{ID: "c1", Name: "id", Type: "int", Nullable: false, OriginalIndex: 0, Original: &ColumnDefinition{Name: "id", Type: "int", Nullable: false}},
			{ID: "c2", Name: "user_name", Type: "varchar", Length: 150.0, Nullable: true, OriginalIndex: 1, Original: &ColumnDefinition{Name: "name", Type: "varchar", Length: 100.0, Nullable: false}},
			{ID: "c3", Name: "status", Type: "varchar", Length: 20.0, Nullable: false, OriginalIndex: 2, DefaultValue: &defActive, Original: &ColumnDefinition{Name: "status", Type: "varchar", Length: 20.0, Nullable: true, DefaultValue: &defActive}},
			{ID: "c4", Name: "age", Type: "int", Nullable: true, OriginalIndex: 3},
			{ID: "c5", Name: "ref_id", Type: "int", Nullable: true, OriginalIndex: 4},
		},
		ForeignKeys: []ForeignKeyDefinition{
			{Name: "fk_ref_id", Columns: []string{"ref_id"}, ReferencedTable: refTableName, ReferencedColumns: []string{"id"}, OnDelete: "CASCADE"},
		},
		CheckConstraints: []CheckConstraintDefinition{
			{Name: "chk_age", Expression: "age >= 0"},
		},
		Indexes: []IndexDefinition{
			{Name: "idx_status", Columns: []string{"status"}, IsUnique: false},
		},
	}

	sqls := compiler.GenerateAlterTableSql(alterReq)
	for _, sql := range sqls {
		fmt.Printf("[%s Test] Executing Alter: %s\n", dialect, sql)
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Errorf("[%s] Alter failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	// --- VERIFY ALTER RESULTS ---
	verifyColSql := fmt.Sprintf("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = '%s' AND table_name = '%s';", schema, tableName)
	res, err := driver.Query(ctx, verifyColSql, nil)
	if err != nil {
		t.Errorf("[%s] Verify columns failed: %v", dialect, err)
	} else {
		foundCols := make(map[string]bool)
		for _, row := range res.Rows {
			var colName, isNullable string
			for k, v := range row {
				if k == "column_name" {
					colName = v.(string)
				}
				if k == "is_nullable" {
					isNullable = v.(string)
				}
			}
			foundCols[colName] = true
			if colName == "user_name" && isNullable != "YES" {
				t.Errorf("[%s] Column user_name should be nullable", dialect)
			}
			if colName == "status" && isNullable != "NO" {
				t.Errorf("[%s] Column status should be NOT NULL", dialect)
			}
		}
		expectedCols := []string{"id", "user_name", "status", "age", "ref_id"}
		for _, ec := range expectedCols {
			if !foundCols[ec] {
				t.Errorf("[%s] Expected column %s not found", dialect, ec)
			}
		}
	}

	// 2. Verify Data Insertion
	insertSql := fmt.Sprintf("INSERT INTO %s.%s (id, user_name, status, age) VALUES (1, 'test', 'active', 25);", schema, tableName)
	if _, err := driver.Query(ctx, insertSql, nil); err != nil {
		t.Errorf("[%s] Valid insert failed: %v", dialect, err)
	}

	invalidInsertSql := fmt.Sprintf("INSERT INTO %s.%s (id, user_name, status, age) VALUES (2, 'fail', 'active', -1);", schema, tableName)
	if _, err := driver.Query(ctx, invalidInsertSql, nil); err == nil {
		t.Errorf("[%s] Check constraint 'chk_age' failed to block negative age", dialect)
	}

	// 5. CREATE VIEW
	viewReq := DiffRequest{
		Dialect: dialect, Schema: schema,
		Views: []ViewDefinition{
			{Name: viewName, Definition: fmt.Sprintf("SELECT id, user_name FROM %s.%s", schema, tableName)},
		},
	}
	for _, sql := range compiler.GenerateCreateViewSql(viewReq) {
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Errorf("[%s] Create View failed: %v", dialect, err)
		}
	}
	verifyViewSql := fmt.Sprintf("SELECT * FROM %s.%s WHERE id = 1;", schema, viewName)
	viewRes, err := driver.Query(ctx, verifyViewSql, nil)
	if err != nil || len(viewRes.Rows) == 0 {
		t.Errorf("[%s] View verification failed: %v", dialect, err)
	}

	// 6. CREATE TRIGGER
	funcSql := "CREATE OR REPLACE FUNCTION test_func() RETURNS trigger AS $$ BEGIN RETURN NEW; END; $$ LANGUAGE plpgsql;"
	driver.Query(ctx, funcSql, nil)
	trigReq := DiffRequest{
		Dialect: dialect, Schema: schema,
		Triggers: []TriggerDefinition{
			{Name: "trig_test", Timing: "BEFORE", Event: "INSERT", TableName: tableName, Definition: "EXECUTE FUNCTION test_func()"},
		},
	}
	for _, sql := range compiler.GenerateCreateTriggerSql(trigReq) {
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Errorf("[%s] Create Trigger failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	// 7. ROUTINES
	routReq := DiffRequest{
		Dialect: dialect, Schema: schema,
		Routines: []RoutineDefinition{
			{Name: "test_func2", Type: "FUNCTION", Definition: "CREATE OR REPLACE FUNCTION test_func2() RETURNS int AS $$ BEGIN RETURN 1; END; $$ LANGUAGE plpgsql;"},
		},
	}
	for _, sql := range compiler.GenerateCreateRoutineSql(routReq) {
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Errorf("[%s] Create Routine failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	t.Logf("[%s] All scenarios passed and verified", dialect)
}
