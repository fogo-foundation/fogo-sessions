use nom::{
    branch::alt,
    bytes::complete::{tag, take_while},
    character::{
        char,
        complete::{line_ending, not_line_ending},
    },
    combinator::{eof, map_opt},
    error::ParseError,
    sequence::{preceded, separated_pair, terminated},
    AsChar, Compare, Input, ParseTo, Parser,
};

pub fn key_value<I, O, E, T>(label: T) -> impl Parser<I, Output = O, Error = E>
where
    I: Input,
    I: ParseTo<O>,
    I: Compare<T>,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    T: Input,
{
    map_opt(
        preceded(
            separated_pair(tag(label), char(':'), take_while(AsChar::is_space)),
            terminated(not_line_ending, alt((line_ending, eof))),
        ),
        |val: I| val.parse_to(),
    )
}

#[cfg(test)]
mod tests {
    use nom::{
        error::{Error, ErrorKind},
        Err,
    };

    use super::*;

    #[test]
    fn test_parse() {
        let result: Result<_, Err<Error<&str>>> = key_value("foo").parse("foo: bar");
        assert_eq!(result, Ok(("", "bar".to_string())))
    }

    #[test]
    fn test_newline_end() {
        let result: Result<_, Err<Error<&str>>> = key_value("foo").parse("foo: bar\n");
        assert_eq!(result, Ok(("", "bar".to_string())))
    }

    #[test]
    fn test_no_space() {
        let result: Result<_, Err<Error<&str>>> = key_value("foo").parse("foo:bar");
        assert_eq!(result, Ok(("", "bar".to_string())))
    }

    #[test]
    fn test_many_spaces() {
        let result: Result<_, Err<Error<&str>>> = key_value("foo").parse("foo: \t  bar");
        assert_eq!(result, Ok(("", "bar".to_string())))
    }

    #[test]
    fn test_no_value() {
        let result: Result<_, Err<Error<&str>>> = key_value("foo").parse("foo:");
        assert_eq!(result, Ok(("", "".to_string())))
    }

    #[test]
    fn test_empty_string() {
        let result: Result<(&str, String), Err<Error<&str>>> = key_value("foo").parse("");
        assert_eq!(
            result.unwrap_err(),
            Err::Error(Error {
                code: ErrorKind::Tag,
                input: ""
            })
        );
    }

    #[test]
    fn test_wrong_tag() {
        let result: Result<(&str, String), Err<Error<&str>>> = key_value("foo").parse("bar: baz");
        assert_eq!(
            result.unwrap_err(),
            Err::Error(Error {
                code: ErrorKind::Tag,
                input: "bar: baz"
            })
        );
    }

    #[test]
    fn test_no_colon() {
        let result: Result<(&str, String), Err<Error<&str>>> = key_value("foo").parse("foo bla");
        assert_eq!(
            result.unwrap_err(),
            Err::Error(Error {
                code: ErrorKind::Char,
                input: " bla"
            })
        );
    }
}
