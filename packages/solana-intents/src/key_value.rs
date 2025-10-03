use nom::{
    branch::alt,
    bytes::complete::{tag, take_till1, take_while1},
    character::complete::{anychar, char, line_ending},
    combinator::{eof, map, map_opt, opt, peek, recognize},
    error::ParseError,
    multi::many_till,
    sequence::{delimited, preceded, separated_pair},
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
                delimited(
                    tag(" "),
                    take_till1(|c: <I as Input>::Item| c.is_newline() || c.as_char() == '\r'),
                    alt((line_ending, eof)),
                ),
                delimited(
                    line_ending,
                    recognize(many_till(
                        anychar,
                        peek(alt((
                            preceded(
                                line_ending,
                                take_while1(|c: <I as Input>::Item| c.as_char() != '-'),
                            ),
                            eof,
                        ))),
                    )),
                    opt(line_ending),
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
        use nom::error::{Error, ErrorKind};
        use nom::Err;

        #[test]
        fn test_no_colon() {
            let result =
                key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1).parse("foo");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Char,
                    input: ""
                })
            );
        }

        #[test]
        fn test_no_value() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:");
            assert_eq!(result, Ok(("", ("foo", "".to_string()))))
        }

        #[test]
        fn test_no_value_after_space() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: ");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: " "
                })
            );
        }

        #[test]
        fn test_no_space() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:bar");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: "bar"
                })
            );
        }

        #[test]
        fn test_same_line_value_eof() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar");
            assert_eq!(result, Ok(("", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_same_line_value_with_space_eof() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar ");
            assert_eq!(result, Ok(("", ("foo", "bar ".to_string()))))
        }

        #[test]
        fn test_same_line_value_with_carriage_return_eof() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar\r"); // The parser expects a \n after the \r
            assert_eq!(
                result,
                Err(Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: " bar\r"
                }))
            )
        }

        #[test]
        fn test_same_line_value_linebreak() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar\nbaz");
            assert_eq!(result, Ok(("baz", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_same_line_value_linebreak_crlf() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: bar\r\nbaz");
            assert_eq!(result, Ok(("baz", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_empty_value_after_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n");
            assert_eq!(result, Ok(("", ("foo", "".to_string()))))
        }

        #[test]
        fn test_value_after_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz");
            assert_eq!(result, Ok(("", ("foo", "-baz".to_string()))))
        }

        #[test]
        fn test_value_after_space_and_newline() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo: \n-baz");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: " \n-baz"
                })
            );
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
            assert_eq!(result, Ok(("baz", ("foo", "-baz".to_string()))))
        }

        #[test]
        fn test_multiline_value() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\n-qux");
            assert_eq!(result, Ok(("", ("foo", "-baz\n-qux".to_string()))))
        }

        #[test]
        fn test_multiline_value_with_next_key() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\n-qux\nbaz");
            assert_eq!(result, Ok(("baz", ("foo", "-baz\n-qux".to_string()))))
        }

        #[test]
        fn test_multiline_value_stops_at_next_line_without_dash() {
            let result = key_value_with_key_type::<_, String, Error<&str>, _, _>(alphanumeric1)
                .parse("foo:\n-baz\n-qux\n\nbaz");
            assert_eq!(result, Ok(("\nbaz", ("foo", "-baz\n-qux".to_string()))))
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
            let result = key_value::<_, String, Error<&str>>("foo:bar");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: "bar"
                })
            );
        }

        #[test]
        fn test_many_spaces() {
            let result = key_value::<_, _, Error<&str>>("foo: \t  bar");
            assert_eq!(result, Ok(("", ("foo", "\t  bar".to_string()))))
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
            let result = tag_key_value::<_, String, Error<&str>, _>("foo").parse("foo:bar");
            assert_eq!(
                result.unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::Eof,
                    input: "bar"
                })
            );
        }

        #[test]
        fn test_many_spaces() {
            let result = tag_key_value::<_, _, Error<&str>, _>("foo").parse("foo: \t  bar");
            assert_eq!(result, Ok(("", "\t  bar".to_string())))
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
