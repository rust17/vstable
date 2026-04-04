use crate::vstable::{ColumnDefinition, DiffRequest, IndexDefinition};

pub fn json_to_prost_value(v: serde_json::Value) -> prost_types::Value {
    use prost_types::value::Kind;
    match v {
        serde_json::Value::Null => prost_types::Value {
            kind: Some(Kind::NullValue(0)),
        },
        serde_json::Value::Bool(b) => prost_types::Value {
            kind: Some(Kind::BoolValue(b)),
        },
        serde_json::Value::Number(n) => prost_types::Value {
            kind: Some(Kind::NumberValue(n.as_f64().unwrap_or(0.0))),
        },
        serde_json::Value::String(s) => prost_types::Value {
            kind: Some(Kind::StringValue(s)),
        },
        serde_json::Value::Array(a) => prost_types::Value {
            kind: Some(Kind::ListValue(prost_types::ListValue {
                values: a.into_iter().map(json_to_prost_value).collect(),
            })),
        },
        serde_json::Value::Object(o) => prost_types::Value {
            kind: Some(Kind::StructValue(prost_types::Struct {
                fields: o
                    .into_iter()
                    .map(|(k, v)| (k, json_to_prost_value(v)))
                    .collect(),
            })),
        },
    }
}

pub fn prost_struct_to_json(s: prost_types::Struct) -> serde_json::Value {
    let mut map = serde_json::Map::new();
    for (k, v) in s.fields {
        map.insert(k, prost_value_to_json(v));
    }
    serde_json::Value::Object(map)
}

pub fn prost_value_to_json(v: prost_types::Value) -> serde_json::Value {
    use prost_types::value::Kind;
    match v.kind {
        Some(Kind::NullValue(_)) => serde_json::Value::Null,
        Some(Kind::BoolValue(b)) => serde_json::Value::Bool(b),
        Some(Kind::NumberValue(n)) => serde_json::Value::Number(
            serde_json::Number::from_f64(n).unwrap_or(serde_json::Number::from(0)),
        ),
        Some(Kind::StringValue(s)) => {
            // Attempt to parse string as JSON. If it's a valid JSON object or array,
            // return the parsed value instead of the string.
            if (s.starts_with('{') && s.ends_with('}')) || (s.starts_with('[') && s.ends_with(']')) {
                if let Ok(json_val) = serde_json::from_str(&s) {
                    return json_val;
                }
            }
            serde_json::Value::String(s)
        }
        Some(Kind::ListValue(l)) => {
            serde_json::Value::Array(l.values.into_iter().map(prost_value_to_json).collect())
        }
        Some(Kind::StructValue(s)) => prost_struct_to_json(s),
        None => serde_json::Value::Null,
    }
}

use serde::Deserialize;

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiffRequestDto {
    #[serde(default)]
    pub dialect: String,
    #[serde(default)]
    pub schema: String,
    #[serde(default)]
    pub table_name: String,
    #[serde(default)]
    pub old_table_name: String,
    #[serde(default)]
    pub columns: Vec<ColumnDefinitionDto>,
    #[serde(default)]
    pub deleted_columns: Vec<ColumnDefinitionDto>,
    #[serde(default)]
    pub indexes: Vec<IndexDefinitionDto>,
    #[serde(default)]
    pub deleted_indexes: Vec<IndexDefinitionDto>,
    #[serde(default)]
    pub foreign_keys: Vec<ForeignKeyDefinitionDto>,
    #[serde(default)]
    pub deleted_foreign_keys: Vec<ForeignKeyDefinitionDto>,
    #[serde(default)]
    pub check_constraints: Vec<CheckConstraintDefinitionDto>,
    #[serde(default)]
    pub deleted_checks: Vec<CheckConstraintDefinitionDto>,
    #[serde(default)]
    pub views: Vec<ViewDefinitionDto>,
    #[serde(default)]
    pub deleted_views: Vec<ViewDefinitionDto>,
    #[serde(default)]
    pub triggers: Vec<TriggerDefinitionDto>,
    #[serde(default)]
    pub deleted_triggers: Vec<TriggerDefinitionDto>,
    #[serde(default)]
    pub routines: Vec<RoutineDefinitionDto>,
    #[serde(default)]
    pub deleted_routines: Vec<RoutineDefinitionDto>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColumnDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub r#type: String,
    #[serde(default = "default_true")]
    pub nullable: bool,
    pub default_value: Option<String>,
    #[serde(default)]
    pub is_primary_key: bool,
    #[serde(default)]
    pub is_auto_increment: bool,
    #[serde(default)]
    pub is_identity: bool,
    #[serde(default)]
    pub comment: String,
    pub length: Option<i64>,
    pub precision: Option<i64>,
    pub scale: Option<i64>,
    #[serde(default = "default_original_index")]
    pub original_index: i32,
    #[serde(rename = "_original")]
    pub original: Option<Box<ColumnDefinitionDto>>,
}

fn default_true() -> bool { true }
fn default_original_index() -> i32 { -1 }

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IndexDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub columns: Vec<String>,
    #[serde(default)]
    pub is_unique: bool,
    #[serde(rename = "_original")]
    pub original: Option<Box<IndexDefinitionDto>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ForeignKeyDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub columns: Vec<String>,
    #[serde(default)]
    pub referenced_table: String,
    #[serde(default)]
    pub referenced_columns: Vec<String>,
    #[serde(default)]
    pub on_delete: String,
    #[serde(default)]
    pub on_update: String,
    #[serde(rename = "_original")]
    pub original: Option<Box<ForeignKeyDefinitionDto>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CheckConstraintDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub expression: String,
    #[serde(rename = "_original")]
    pub original: Option<Box<CheckConstraintDefinitionDto>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ViewDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub definition: String,
    #[serde(rename = "_original")]
    pub original: Option<Box<ViewDefinitionDto>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct TriggerDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub timing: String,
    #[serde(default)]
    pub event: String,
    #[serde(default)]
    pub table_name: String,
    #[serde(default)]
    pub definition: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(rename = "_original")]
    pub original: Option<Box<TriggerDefinitionDto>>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RoutineDefinitionDto {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub r#type: String,
    #[serde(default)]
    pub definition: String,
    #[serde(rename = "_original")]
    pub original: Option<Box<RoutineDefinitionDto>>,
}

impl From<ColumnDefinitionDto> for ColumnDefinition {
    fn from(dto: ColumnDefinitionDto) -> Self {
        ColumnDefinition {
            name: dto.name,
            r#type: dto.r#type,
            nullable: dto.nullable,
            default_value: dto.default_value,
            is_primary_key: dto.is_primary_key,
            is_auto_increment: dto.is_auto_increment,
            comment: dto.comment,
            length: dto.length.map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            precision: dto.precision.map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            scale: dto.scale.map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            enum_values: vec![],
            id: dto.id,
            is_default_expression: false,
            is_identity: dto.is_identity,
            original: dto.original.map(|o| Box::new(ColumnDefinition::from(*o))),
            original_index: dto.original_index,
            pk_constraint_name: "".to_string(),
        }
    }
}

impl From<IndexDefinitionDto> for IndexDefinition {
    fn from(dto: IndexDefinitionDto) -> Self {
        IndexDefinition {
            name: dto.name,
            columns: dto.columns,
            is_unique: dto.is_unique,
            id: dto.id,
            original: dto.original.map(|o| Box::new(IndexDefinition::from(*o))),
        }
    }
}

use crate::vstable::{
    CheckConstraintDefinition, ForeignKeyDefinition, RoutineDefinition, TriggerDefinition,
    ViewDefinition,
};

impl From<ForeignKeyDefinitionDto> for ForeignKeyDefinition {
    fn from(dto: ForeignKeyDefinitionDto) -> Self {
        ForeignKeyDefinition {
            id: dto.id,
            name: dto.name,
            columns: dto.columns,
            referenced_table: dto.referenced_table,
            referenced_columns: dto.referenced_columns,
            on_delete: dto.on_delete,
            on_update: dto.on_update,
            original: dto.original.map(|o| Box::new(ForeignKeyDefinition::from(*o))),
        }
    }
}

impl From<CheckConstraintDefinitionDto> for CheckConstraintDefinition {
    fn from(dto: CheckConstraintDefinitionDto) -> Self {
        CheckConstraintDefinition {
            id: dto.id,
            name: dto.name,
            expression: dto.expression,
            original: dto.original.map(|o| Box::new(CheckConstraintDefinition::from(*o))),
        }
    }
}

impl From<ViewDefinitionDto> for ViewDefinition {
    fn from(dto: ViewDefinitionDto) -> Self {
        ViewDefinition {
            id: dto.id,
            name: dto.name,
            definition: dto.definition,
            original: dto.original.map(|o| Box::new(ViewDefinition::from(*o))),
        }
    }
}

impl From<TriggerDefinitionDto> for TriggerDefinition {
    fn from(dto: TriggerDefinitionDto) -> Self {
        TriggerDefinition {
            id: dto.id,
            name: dto.name,
            timing: dto.timing,
            event: dto.event,
            table_name: dto.table_name,
            definition: dto.definition,
            enabled: dto.enabled,
            original: dto.original.map(|o| Box::new(TriggerDefinition::from(*o))),
        }
    }
}

impl From<RoutineDefinitionDto> for RoutineDefinition {
    fn from(dto: RoutineDefinitionDto) -> Self {
        RoutineDefinition {
            id: dto.id,
            name: dto.name,
            r#type: dto.r#type,
            definition: dto.definition,
            original: dto.original.map(|o| Box::new(RoutineDefinition::from(*o))),
        }
    }
}

impl From<DiffRequestDto> for DiffRequest {
    fn from(dto: DiffRequestDto) -> Self {
        DiffRequest {
            dialect: dto.dialect,
            schema: dto.schema,
            table_name: dto.table_name,
            old_table_name: dto.old_table_name,
            columns: dto.columns.into_iter().map(|c| c.into()).collect(),
            deleted_columns: dto.deleted_columns.into_iter().map(|c| c.into()).collect(),
            indexes: dto.indexes.into_iter().map(|i| i.into()).collect(),
            deleted_indexes: dto.deleted_indexes.into_iter().map(|i| i.into()).collect(),
            foreign_keys: dto.foreign_keys.into_iter().map(|f| f.into()).collect(),
            deleted_foreign_keys: dto
                .deleted_foreign_keys
                .into_iter()
                .map(|f| f.into())
                .collect(),
            check_constraints: dto
                .check_constraints
                .into_iter()
                .map(|c| c.into())
                .collect(),
            deleted_checks: dto.deleted_checks.into_iter().map(|c| c.into()).collect(),
            views: dto.views.into_iter().map(|v| v.into()).collect(),
            deleted_views: dto.deleted_views.into_iter().map(|v| v.into()).collect(),
            triggers: dto.triggers.into_iter().map(|t| t.into()).collect(),
            deleted_triggers: dto.deleted_triggers.into_iter().map(|t| t.into()).collect(),
            routines: dto.routines.into_iter().map(|r| r.into()).collect(),
            deleted_routines: dto.deleted_routines.into_iter().map(|r| r.into()).collect(),
            config: None,
        }
    }
}

pub fn json_to_diff_request(v: serde_json::Value) -> Result<DiffRequest, String> {
    let dto: DiffRequestDto = serde_json::from_value(v).map_err(|e| format!("Invalid DiffRequest format: {}", e))?;
    Ok(dto.into())
}
