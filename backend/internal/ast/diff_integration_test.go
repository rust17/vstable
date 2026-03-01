package ast

import (
	"context"
	"fmt"
	"os"
	"quickpg-engine/internal/db"
	"testing"
	"time"
)

func runCommonIntegrationTest(t *testing.T, dialect string, dsn string, compiler Compiler) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	dbManager := db.NewManager()
	err := dbManager.Connect(ctx, "test-session", dialect, dsn)
	if err != nil {
		t.Fatalf("[%s] Connection failed: %v", dialect, err)
	}
	defer dbManager.Disconnect("test-session")
	driver, _ := dbManager.Get("test-session")

	tableName := fmt.Sprintf("sync_test_%s", dialect)
	schema := "public"
	if dialect == "mysql" {
		schema = "quickpg_test"
	}

	// 1. Cleanup
	cleanupSql := fmt.Sprintf("DROP TABLE IF EXISTS %s;", tableName)
	if dialect == "pg" {
		cleanupSql = fmt.Sprintf("DROP TABLE IF EXISTS %s.%s CASCADE;", schema, tableName)
	}
	driver.Query(ctx, cleanupSql, nil)

	// 2. CREATE: (id, name, status)
	// - name: 初始 NOT NULL
	// - status: 初始 NULL
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
			t.Fatalf("[%s] Create failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	// 3. ALTER: Nullable 切换测试
	// - name: NOT NULL -> NULL (Allow Null)
	// - status: NULL -> NOT NULL (Restrict Null)
	alterReq := DiffRequest{
		Dialect:      dialect,
		Schema:       schema,
		TableName:    tableName,
		OldTableName: tableName,
		Columns: []ColumnDefinition{
			{ID: "c1", Name: "id", Type: "int", Nullable: false, OriginalIndex: 0, Original: &ColumnDefinition{Name: "id", Type: "int", Nullable: false}},
			// name: 变为 NULL
			{ID: "c2", Name: "name", Type: "varchar", Length: 100.0, Nullable: true, OriginalIndex: 1, Original: &ColumnDefinition{Name: "name", Type: "varchar", Length: 100.0, Nullable: false}},
			// status: 变为 NOT NULL
			{ID: "c3", Name: "status", Type: "varchar", Length: 20.0, Nullable: false, OriginalIndex: 2, DefaultValue: &defActive, Original: &ColumnDefinition{Name: "status", Type: "varchar", Length: 20.0, Nullable: true, DefaultValue: &defActive}},
		},
	}

	sqls := compiler.GenerateAlterTableSql(alterReq)
	for _, sql := range sqls {
		fmt.Printf("[%s Test] Executing Nullable Alter: %s\n", dialect, sql)
		if _, err := driver.Query(ctx, sql, nil); err != nil {
			t.Errorf("[%s] Nullable Alter failed: %v (SQL: %s)", dialect, err, sql)
		}
	}

	t.Logf("[%s] Nullable transition test passed", dialect)
}

func TestPostgresSyncIntegration(t *testing.T) {
	dsn := os.Getenv("PG_DSN")
	if dsn == "" { dsn = "postgres://root:password@localhost:5433/quickpg_test?sslmode=disable" }
	runCommonIntegrationTest(t, "pg", dsn, &PGCompiler{})
}

func TestMysqlSyncIntegration(t *testing.T) {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" { dsn = "root:password@tcp(127.0.0.1:3307)/quickpg_test?charset=utf8mb4&parseTime=True&loc=Local" }
	runCommonIntegrationTest(t, "mysql", dsn, &MysqlCompiler{})
}
