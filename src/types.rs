use std::str::FromStr;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
pub enum Params {
	/// No parameters
	None,
	/// Array of values
	Array(Vec<Value>),
	/// Map of values
	Map(serde_json::Map<String, Value>),
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RpcRequestObject {
    pub jsonrpc: String,

    pub method: String,

    #[serde(skip_serializing_if="Option::is_none")]
    pub params: Option<Params>,

    pub id: Value,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RpcError {
    pub code: i64,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct RpcResponseObject {
    pub jsonrpc: String,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RpcError>,
    
    pub id: Value
}

#[derive(Debug, PartialEq)]
pub enum AllowedMethods {
    GetVersion,
    GetSlot
}

impl FromStr for AllowedMethods {
    // type Err = String::from("Invalid RPC method"); // You can define a custom error type here
    type Err = (); // We return an empty error if the string doesn't match
    
    fn from_str(input: &str) -> Result<AllowedMethods, Self::Err> {
        match input {
            "getVersion" => Ok(AllowedMethods::GetVersion),
            "getSlot" =>Ok(AllowedMethods::GetSlot),
            _ => Err(())
        }
    }
}