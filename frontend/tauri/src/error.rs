use serde::{Serialize, Serializer};
#[derive(Debug)]
pub enum AppError {
    ConnectionFailed(String),
    QuerySyntax(String),
    Internal(String),
    NotFound(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("AppError", 2)?;
        match self {
            AppError::ConnectionFailed(msg) => {
                state.serialize_field("code", "ConnectionFailed")?;
                state.serialize_field("message", msg)?;
            }
            AppError::QuerySyntax(msg) => {
                state.serialize_field("code", "QuerySyntax")?;
                state.serialize_field("message", msg)?;
            }
            AppError::Internal(msg) => {
                state.serialize_field("code", "Internal")?;
                state.serialize_field("message", msg)?;
            }
            AppError::NotFound(msg) => {
                state.serialize_field("code", "NotFound")?;
                state.serialize_field("message", msg)?;
            }
        }
        state.end()
    }
}


impl From<String> for AppError {
    fn from(msg: String) -> Self {
        AppError::Internal(msg)
    }
}
