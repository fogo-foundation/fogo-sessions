use crate::line;
use nom::{
    branch::alt,
    bytes::complete::{tag, take_till1, take_while1},
    character::{
        char,
        complete::{alphanumeric1, line_ending, not_line_ending, space0},
    },
    combinator::{eof, map, map_opt, opt, peek, recognize, value},
    error::ParseError,
    multi::many_till,
    sequence::{preceded, separated_pair, terminated},
    AsChar, Compare, IResult, Input, Offset, ParseTo, Parser,
};

pub fn tag_key_value<I, O, E, T>(key: T) -> impl Parser<I, Output = O, Error = E>
where
    I: Input,
    I: ParseTo<O>,
    I: Offset,
    I: Compare<&'static str>,
    I: Compare<T>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    T: Input,
{
    map(key_value_with_key_type(tag(key)), |(_, value)| value)
}

pub fn key_value<I, O, E>(input: I) -> IResult<I, (I, O), E>
where
    I: Input,
    I: ParseTo<O>,
    I: Offset,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
{
    key_value_with_key_type(take_while1(|c: <I as Input>::Item| {
        c.is_alphanum() || ['_'].contains(&c.as_char()) // snake_case
    }))
    .parse(input)
}

fn key_value_with_key_type<I, O, E, K, KO>(key: K) -> impl Parser<I, Output = (KO, O), Error = E>
where
    I: Input,
    I: ParseTo<O>,
    I: Offset,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    K: Parser<I, Output = KO, Error = E>,
{
    map_opt(
        separated_pair(
            key,
            char(':'),
            alt((
                line(terminated(
                    preceded(space0, take_till1(|c: <I as Input>::Item| c.is_newline())),
                    space0,
                )),
                preceded(
                    preceded(space0, line_ending),
                    recognize(many_till(
                        terminated(not_line_ending, opt(line_ending)),
                        peek(alt((value((), alphanumeric1), value((), eof)))),
                    )),
                ),
                eof,
            )),
        ),
        |(key, val): (KO, I)| val.parse_to().map(|parsed| (key, parsed)),
    )
}
#[cfg(test)]
mod tests {
    mod key_value_with_key_type {
        use super::super::*;
        use nom::error::Error;

        #[test]
        fn test_no_colon() {
            let result =
                key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1).parse("foo");
            assert!(result.is_err());
        }

        #[test]
        fn test_no_value() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:");
            assert!(result.is_ok());
        }

        #[test]
        fn test_no_value_after_space() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: ");
            assert!(result.is_err());
        }

        #[test]
        fn test_no_space() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:bar");
            assert!(result.is_ok());
        }

        #[test]
        fn test_same_line_value_eof() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar");
            assert!(result.is_ok());
        }

        #[test]
        fn test_same_line_value_with_space_eof() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar ");
            assert!(result.is_ok());
        }

        #[test]
        fn test_same_line_value_linebreak() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar\nbaz");
            assert!(result.is_ok());
        }

        #[test]
        fn test_empty_value_after_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n");
            assert!(result.is_ok());
        }

        #[test]
        fn test_value_after_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz");
            assert!(result.is_ok());
        }

        #[test]
        fn test_value_after_space_and_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: \n-baz");
            assert!(result.is_ok());
        }

        #[test]
        fn test_empty_value_after_newline_with_next_key() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\nbaz");
            assert!(result.is_ok());
        }

        #[test]
        fn test_value_after_newline_with_next_key() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\nbaz");
            assert!(result.is_ok());
        }

        #[test]
        fn test_multiline_value() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\n-qux");
            assert!(result.is_ok());
        }

        #[test]
        fn test_multiline_value_with_next_key() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\n-qux\nbaz");
            assert!(result.is_ok());
        }
    }

    mod key_value {
        use super::super::*;
        use nom::{
            error::{Error, ErrorKind},
            Err,
        };

        #[test]
        fn test_parse() {
            let result = key_value::<_, _, Error<&str>>("foo: bar");
            assert_eq!(result, Ok(("", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_no_space() {
            let result = key_value::<_, _, Error<&str>>("foo:bar");
            assert_eq!(result, Ok(("", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_many_spaces() {
            let result = key_value::<_, _, Error<&str>>("foo: \t  bar");
            assert_eq!(result, Ok(("", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_no_value() {
            let result = key_value::<_, _, Error<&str>>("foo:");
            assert_eq!(result, Ok(("", ("foo", "".to_string()))))
        }

        #[test]
        fn test_empty_string() {
            let result = key_value::<_, String, _>("");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: ""
                })
            );
        }

        #[test]
        fn test_no_colon() {
            let result = key_value::<_, String, _>("foo bla");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Char,
                    input: " bla"
                })
            );
        }
    }

    mod tag_key_value {
        use super::super::*;
        use nom::{
            error::{Error, ErrorKind},
            Err,
        };

        #[test]
        fn test_parse() {
            let result = tag_key_value::<_, _, Error<&str>, _>("foo").parse("foo: bar");
            assert_eq!(result, Ok(("", "bar".to_string())))
        }

        #[test]
        fn test_no_space() {
            let result = tag_key_value::<_, _, Error<&str>, _>("foo").parse("foo:bar");
            assert_eq!(result, Ok(("", "bar".to_string())))
        }

        #[test]
        fn test_many_spaces() {
            let result = tag_key_value::<_, _, Error<&str>, _>("foo").parse("foo: \t  bar");
            assert_eq!(result, Ok(("", "bar".to_string())))
        }

        #[test]
        fn test_no_value() {
            let result = tag_key_value::<_, _, Error<&str>, _>("foo").parse("foo:");
            assert_eq!(result, Ok(("", "".to_string())))
        }

        #[test]
        fn test_empty_string() {
            let result = tag_key_value::<_, String, _, _>("foo").parse("");
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
            let result = tag_key_value::<_, String, _, _>("foo").parse("bar: baz");
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
            let result = tag_key_value::<_, String, _, _>("foo").parse("foo bla");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Char,
                    input: " bla"
                })
            );
        }
    }
}
