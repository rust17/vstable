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
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ColumnDefinitionDto {
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
    pub comment: String,
    pub length: Option<i64>,
    pub precision: Option<i64>,
    pub scale: Option<i64>,
    #[serde(default = "default_original_index")]
    pub original_index: i32,
}

fn default_true() -> bool { true }
fn default_original_index() -> i32 { -1 }

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IndexDefinitionDto {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub columns: Vec<String>,
    #[serde(default)]
    pub is_unique: bool,
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
            id: "".to_string(),
            is_default_expression: false,
            is_identity: false,
            original: None,
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
            id: "".to_string(),
            original: None,
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
            foreign_keys: vec![],
            deleted_foreign_keys: vec![],
            check_constraints: vec![],
            deleted_checks: vec![],
            views: vec![],
            deleted_views: vec![],
            triggers: vec![],
            deleted_triggers: vec![],
            routines: vec![],
            deleted_routines: vec![],
            config: None,
        }
    }
}

pub fn json_to_diff_request(v: serde_json::Value) -> Result<DiffRequest, String> {
    let dto: DiffRequestDto = serde_json::from_value(v).map_err(|e| format!("Invalid DiffRequest format: {}", e))?;
    Ok(dto.into())
}
