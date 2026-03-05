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

type ForeignKeyDefinition struct {
	ID                string                `json:"id"`
	Name              string                `json:"name"`
	Columns           []string              `json:"columns"`
	ReferencedTable   string                `json:"referencedTable"`
	ReferencedColumns []string              `json:"referencedColumns"`
	OnDelete          string                `json:"onDelete"`
	OnUpdate          string                `json:"onUpdate"`
	Original          *ForeignKeyDefinition `json:"_original"`
}

type CheckConstraintDefinition struct {
	ID         string                     `json:"id"`
	Name       string                     `json:"name"`
	Expression string                     `json:"expression"`
	Original   *CheckConstraintDefinition `json:"_original"`
}

type ViewDefinition struct {
	ID         string          `json:"id"`
	Name       string          `json:"name"`
	Definition string          `json:"definition"`
	Original   *ViewDefinition `json:"_original"`
}

type TriggerDefinition struct {
	ID         string             `json:"id"`
	Name       string             `json:"name"`
	Timing     string             `json:"timing"`
	Event      string             `json:"event"`
	TableName  string             `json:"tableName"`
	Definition string             `json:"definition"`
	Enabled    bool               `json:"enabled"`
	Original   *TriggerDefinition `json:"_original"`
}

type RoutineDefinition struct {
	ID         string             `json:"id"`
	Name       string             `json:"name"`
	Type       string             `json:"type"` // PROCEDURE or FUNCTION
	Definition string             `json:"definition"`
	Original   *RoutineDefinition `json:"_original"`
}

type DatabaseConfig struct {
	Charset             string `json:"charset"`
	Collation           string `json:"collation"`
	Engine              string `json:"engine"`
	AutoIncrementOffset int    `json:"autoIncrementOffset"`
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

	ForeignKeys        []ForeignKeyDefinition      `json:"foreignKeys"`
	DeletedForeignKeys []ForeignKeyDefinition      `json:"deletedForeignKeys"`
	CheckConstraints   []CheckConstraintDefinition `json:"checkConstraints"`
	DeletedChecks      []CheckConstraintDefinition `json:"deletedChecks"`

	Views        []ViewDefinition `json:"views"`
	DeletedViews []ViewDefinition `json:"deletedViews"`

	Triggers        []TriggerDefinition `json:"triggers"`
	DeletedTriggers []TriggerDefinition `json:"deletedTriggers"`

	Routines        []RoutineDefinition `json:"routines"`
	DeletedRoutines []RoutineDefinition `json:"deletedRoutines"`

	Config *DatabaseConfig `json:"config"`
}

type DiffResponse struct {
	SQL []string `json:"sql"`
}
