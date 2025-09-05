use nom::{
    bytes::complete::{tag, take_while1},
    character::{
        char,
        complete::{not_line_ending, space0},
    },
    combinator::{map, map_opt},
    error::ParseError,
    sequence::separated_pair,
    AsChar, Compare, IResult, Input, ParseTo, Parser,
};

pub fn tag_key_value<I, O, E, T>(key: T) -> impl Parser<I, Output = O, Error = E>
where
    I: Input,
    I: ParseTo<O>,
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
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
{
    key_value_with_key_type(take_while1(|c: <I as Input>::Item| {
        c.is_alphanum() || ['_', '-'].contains(&c.as_char())
    }))
    .parse(input)
}

fn key_value_with_key_type<I, O, E, K, KO>(key: K) -> impl Parser<I, Output = (KO, O), Error = E>
where
    I: Input,
    I: ParseTo<O>,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    K: Parser<I, Output = KO, Error = E>,
{
    map_opt(
        separated_pair(key, (char(':'), space0), not_line_ending),
        |(key, val): (KO, I)| val.parse_to().map(|parsed| (key, parsed)),
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
