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
        Some(Kind::StringValue(s)) => serde_json::Value::String(s),
        Some(Kind::ListValue(l)) => {
            serde_json::Value::Array(l.values.into_iter().map(prost_value_to_json).collect())
        }
        Some(Kind::StructValue(s)) => prost_struct_to_json(s),
        None => serde_json::Value::Null,
    }
}

pub fn json_to_diff_request(v: serde_json::Value) -> DiffRequest {
    DiffRequest {
        dialect: v["dialect"].as_str().unwrap_or("").to_string(),
        schema: v["schema"].as_str().unwrap_or("").to_string(),
        table_name: v["table"].as_str().unwrap_or("").to_string(),
        old_table_name: v["original_name"].as_str().unwrap_or("").to_string(),
        columns: json_to_vec_column(v["columns"].clone()),
        deleted_columns: json_to_vec_column(v["deleted_columns"].clone()),
        indexes: json_to_vec_index(v["indexes"].clone()),
        deleted_indexes: json_to_vec_index(v["deleted_indexes"].clone()),
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

fn json_to_vec_column(v: serde_json::Value) -> Vec<ColumnDefinition> {
    v.as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|c| ColumnDefinition {
            name: c["name"].as_str().unwrap_or("").to_string(),
            r#type: c["type"].as_str().unwrap_or("").to_string(),
            nullable: c["nullable"].as_bool().unwrap_or(true),
            default_value: c["default_value"].as_str().map(|s| s.to_string()),
            is_primary_key: c["primary_key"].as_bool().unwrap_or(false),
            is_auto_increment: c["auto_increment"].as_bool().unwrap_or(false),
            comment: c["comment"].as_str().unwrap_or("").to_string(),
            length: c["length"]
                .as_i64()
                .map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            precision: c["precision"]
                .as_i64()
                .map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            scale: c["scale"]
                .as_i64()
                .map(|i| json_to_prost_value(serde_json::Value::Number(i.into()))),
            enum_values: vec![],
            id: "".to_string(),
            is_default_expression: false,
            is_identity: false,
            original: None,
            original_index: c["original_index"].as_i64().map(|i| i as i32).unwrap_or(-1),
            pk_constraint_name: "".to_string(),
        })
        .collect()
}

fn json_to_vec_index(v: serde_json::Value) -> Vec<IndexDefinition> {
    v.as_array()
        .unwrap_or(&vec![])
        .iter()
        .map(|i| IndexDefinition {
            name: i["name"].as_str().unwrap_or("").to_string(),
            columns: i["columns"]
                .as_array()
                .unwrap_or(&vec![])
                .iter()
                .map(|s| s.as_str().unwrap_or("").to_string())
                .collect(),
            is_unique: i["unique"].as_bool().unwrap_or(false),
            id: "".to_string(),
            original: None,
        })
        .collect()
}
