package db

import (
	"context"
	"database/sql"
	"fmt"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jackc/pgx/v5/pgxpool"
)

// FieldInfo 表示列的元数据
type FieldInfo struct {
	Name string `json:"name"`
	Type string `json:"type"`
}

// QueryResult 包含查询的数据和元数据
type QueryResult struct {
	Rows   []map[string]interface{} `json:"rows"`
	Fields []FieldInfo              `json:"fields"`
}

// Driver 是统一的数据库操作接口
type Driver interface {
	Query(ctx context.Context, sql string, params []interface{}) (*QueryResult, error)
	Ping(ctx context.Context) error
	Close() error
}

// Manager 管理所有活动的数据库会话
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]Driver
}

func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]Driver),
	}
}

// Connect 根据配置建立 PG 或 MySQL 连接并存入管理器
func (m *Manager) Connect(ctx context.Context, id string, dialect string, dsn string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	var driver Driver
	var err error

	if dialect == "pg" || dialect == "postgresql" || dialect == "postgres" {
		driver, err = NewPgDriver(ctx, dsn)
	} else if dialect == "mysql" {
		driver, err = NewMysqlDriver(dsn)
	} else {
		return fmt.Errorf("unsupported dialect: %s", dialect)
	}

	if err != nil {
		return err
	}

	// 立即测试连接
	if err := driver.Ping(ctx); err != nil {
		driver.Close()
		return fmt.Errorf("ping failed: %v", err)
	}

	m.sessions[id] = driver
	return nil
}

func (m *Manager) Get(id string) (Driver, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	d, ok := m.sessions[id]
	if !ok {
		return nil, fmt.Errorf("session not found: %s", id)
	}
	return d, nil
}

func (m *Manager) Disconnect(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if d, ok := m.sessions[id]; ok {
		delete(m.sessions, id)
		return d.Close()
	}
	return nil
}

// --- PostgreSQL Driver ---
type PgDriver struct {
	pool *pgxpool.Pool
}

func NewPgDriver(ctx context.Context, dsn string) (*PgDriver, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	return &PgDriver{pool: pool}, nil
}

func (d *PgDriver) Query(ctx context.Context, query string, params []interface{}) (*QueryResult, error) {
	rows, err := d.pool.Query(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fieldsDesc := rows.FieldDescriptions()
	fields := make([]FieldInfo, len(fieldsDesc))
	for i, f := range fieldsDesc {
		fields[i] = FieldInfo{Name: f.Name, Type: ""} // pgx OID to type string mapping is complex, leaving empty for now
	}

	resultRows := make([]map[string]interface{}, 0)
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, err
		}
		row := make(map[string]interface{})
		for i, field := range fieldsDesc {
			row[field.Name] = values[i]
		}
		resultRows = append(resultRows, row)
	}

	return &QueryResult{Rows: resultRows, Fields: fields}, nil
}

func (d *PgDriver) Ping(ctx context.Context) error {
	return d.pool.Ping(ctx)
}

func (d *PgDriver) Close() error {
	d.pool.Close()
	return nil
}

// --- MySQL Driver ---
type MysqlDriver struct {
	db *sql.DB
}

func NewMysqlDriver(dsn string) (*MysqlDriver, error) {
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	return &MysqlDriver{db: db}, nil
}

func (d *MysqlDriver) Query(ctx context.Context, query string, params []interface{}) (*QueryResult, error) {
	rows, err := d.db.QueryContext(ctx, query, params...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cols, _ := rows.Columns()
	fields := make([]FieldInfo, len(cols))
	for i, name := range cols {
		fields[i] = FieldInfo{Name: name, Type: ""}
	}

	resultRows := make([]map[string]interface{}, 0)
	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return nil, err
		}

		m := make(map[string]interface{})
		for i, colName := range cols {
			val := columns[i]
			if b, ok := val.([]byte); ok {
				m[colName] = string(b)
			} else {
				m[colName] = val
			}
		}
		resultRows = append(resultRows, m)
	}

	return &QueryResult{Rows: resultRows, Fields: fields}, nil
}

func (d *MysqlDriver) Ping(ctx context.Context) error {
	return d.db.PingContext(ctx)
}

func (d *MysqlDriver) Close() error {
	return d.db.Close()
}
