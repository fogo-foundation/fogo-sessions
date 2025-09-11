use nom::{
    bits::complete::take, branch::alt, bytes::{complete::{tag, take_till1, take_while1}, take_till}, character::{
        anychar, char, complete::{alphanumeric1, line_ending, not_line_ending, space0, space1}
    }, combinator::{eof, map, map_opt, opt, peek, recognize, rest, value}, error::ParseError, multi::{many1, many_till}, sequence::{pair, preceded, separated_pair, terminated}, AsChar, Compare, IResult, Input, Offset, ParseTo, Parser
};
use nom::lib::std::fmt::Debug;

use crate::line;

pub fn tag_key_value<I, O, E, T>(key: T) -> impl Parser<I, Output = O, Error = E>
where
    I: Input,
    I: ParseTo<O>,
    I: Compare<&'static str>,
    I: Compare<T>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    I: Debug,
    I: Offset,
    T: Input,
{
    map(key_value_with_key_type(tag(key)), |(_, value)| value)
}

pub fn key_value<I, O, E>(input: I) -> IResult<I, (I, O), E>
where
    I: Input,
    I: ParseTo<O>,
    I: Compare<&'static str>,
    I: Offset,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    I: Debug,
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
    I: Debug,
    K: Parser<I, Output = KO, Error = E>,
{
    map_opt(
        separated_pair(
            key,
            char(':'),
       alt((
                line(terminated(preceded(space0, take_till1(|c: <I as Input>::Item| c.is_newline())), space0)),
                preceded(
                    preceded(space0, line_ending),
                    recognize(many_till(
                        terminated(not_line_ending, opt(line_ending)),
                        peek(alt((
                            value((), alphanumeric1),
                            value((), eof),
                        ))),
                    )),
                ),
                rest
            )),
        ),
        |(key, val): (KO, I)| {
            return val.parse_to().map(|parsed| (key, parsed))},
    )
}
#[cfg(test)]
mod tests {
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

        #[test]
        fn test_value_with_another_key(){
            let result = key_value::<_, String, Error<&str>>("foo: bar\nbar:");
            assert_eq!(result, Ok(("bar:", ("foo", "bar".to_string()))))
        }

        #[test]
        fn test_space_linebreak() {
            let result = key_value::<_, String, Error<&str>>("foo: \nbar");
            assert_eq!(result, Ok(("bar", ("foo", "".to_string()))))
        }

        #[test]
        fn test_empty_value_linebreak() {
            let result = key_value::<_, String, Error<&str>>("foo:\nbar:");
            assert_eq!(result, Ok(("bar:", ("foo", "".to_string()))))
        }

        #[test]
        fn test_multiline_value() {
            let result = key_value::<_, String, Error<&str>>("foo:\n-bar\n-baz");
            assert_eq!(result, Ok(("", ("foo", "-bar\n-baz".to_string()))))
        }

        #[test]
        fn test_multiline_value_with_another_key() {
            let result = key_value::<_, String, Error<&str>>("foo:\n-bar\n-baz\nbar:");
            assert_eq!(result, Ok(("bar:", ("foo", "-bar\n-baz\n".to_string()))))
        }

        #[test]
        fn test_multiline_value_eof() {
            let result = key_value::<_, String, Error<&str>>("foo:\n-bar\n-baz");
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
