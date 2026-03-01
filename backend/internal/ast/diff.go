package ast

import "fmt"

type Compiler interface {
	GenerateAlterTableSql(req DiffRequest) []string
	GenerateCreateTableSql(req DiffRequest) []string
}

func GetCompiler(dialect string) (Compiler, error) {
	switch dialect {
	case "pg", "postgresql", "postgres":
		return &PGCompiler{}, nil
	case "mysql":
		return &MysqlCompiler{}, nil
	default:
		return nil, fmt.Errorf("unsupported dialect for SQL generation: %s", dialect)
	}
}
