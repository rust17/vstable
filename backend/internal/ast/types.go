package ast

type ColumnDefinition struct {
	ID                  string            `json:"id"`
	Name                string            `json:"name"`
	Type                string            `json:"type"`
	EnumValues          []string          `json:"enumValues"`
	Length              interface{}       `json:"length"`
	Precision           interface{}       `json:"precision"`
	Scale               interface{}       `json:"scale"`
	Nullable            bool              `json:"nullable"`
	DefaultValue        *string           `json:"defaultValue"`
	IsDefaultExpression bool              `json:"isDefaultExpression"`
	IsPrimaryKey        bool              `json:"isPrimaryKey"`
	IsAutoIncrement     bool              `json:"isAutoIncrement"`
	IsIdentity          bool              `json:"isIdentity"`
	Comment             string            `json:"comment"`
	PkConstraintName    string            `json:"pkConstraintName"`
	OriginalIndex       int               `json:"originalIndex"`
	Original            *ColumnDefinition `json:"_original"` // 关键：对应前端的 _original
}

type IndexDefinition struct {
	ID       string           `json:"id"`
	Name     string           `json:"name"`
	Columns  []string         `json:"columns"`
	IsUnique bool             `json:"isUnique"`
	Original *IndexDefinition `json:"_original"`
}

type DiffRequest struct {
	Dialect        string             `json:"dialect"`
	Schema         string             `json:"schema"`
	TableName      string             `json:"tableName"`
	OldTableName   string             `json:"oldTableName"`
	Columns        []ColumnDefinition `json:"columns"`
	Indexes        []IndexDefinition  `json:"indexes"`
	DeletedColumns []ColumnDefinition `json:"deletedColumns"`
	DeletedIndexes []IndexDefinition  `json:"deletedIndexes"`
}

type DiffResponse struct {
	SQL []string `json:"sql"`
}
