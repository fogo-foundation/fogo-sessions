use nom::{
    bytes::complete::take_while1,
    character::char,
    combinator::{map, map_opt},
    error::{Error, ParseError},
    sequence::separated_pair,
    AsChar, Err, IResult, Input, ParseTo, Parser,
};
use std::str::FromStr;

#[derive(PartialEq, Debug)]
pub struct Version {
    pub major: u8,
    pub minor: u8,
}

impl FromStr for Version {
    type Err = Err<Error<String>>;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match version.parse(s) {
            Ok((_, version)) => Ok(version),
            Err(e) => Err(Err::<Error<&str>>::to_owned(e)),
        }
    }
}

fn version<T, E>(input: T) -> IResult<T, Version, E>
where
    T: Input + ParseTo<u8>,
    <T as Input>::Item: AsChar,
    E: ParseError<T>,
{
    map(
        separated_pair(integer_u8, char('.'), integer_u8),
        |(major, minor)| Version { major, minor },
    )
    .parse(input)
}

fn integer_u8<T, E>(input: T) -> IResult<T, u8, E>
where
    T: Input + ParseTo<u8>,
    <T as Input>::Item: AsChar,
    E: ParseError<T>,
{
    map_opt(take_while1(AsChar::is_dec_digit), |val: T| val.parse_to()).parse(input)
}

#[cfg(test)]
mod tests {
    mod from_str {
        use nom::error::ErrorKind;
        use std::num::NonZero;

        use super::super::*;

        #[test]
        fn test_valid() {
            assert_eq!(
                "5.7".parse::<Version>().unwrap(),
                Version { major: 5, minor: 7 }
            );
        }

        #[test]
        fn test_major_only() {
            assert_eq!(
                "5".parse::<Version>().unwrap_err(),
                Err::Incomplete(nom::Needed::Size(unsafe { NonZero::new_unchecked(1) }))
            );
        }

        #[test]
        fn test_empty_string() {
            assert_eq!(
                "".parse::<Version>().unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: "".to_string()
                })
            );
        }

        #[test]
        fn test_missing_major() {
            assert_eq!(
                ".5".parse::<Version>().unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: ".5".to_string()
                })
            );
        }

        #[test]
        fn test_missing_minor() {
            assert_eq!(
                "5.".parse::<Version>().unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: "".to_string()
                })
            );
        }

        #[test]
        fn test_missing_major_and_minor() {
            assert_eq!(
                ".".parse::<Version>().unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: ".".to_string()
                })
            );
        }

        #[test]
        fn test_unrelated_string() {
            assert_eq!(
                "foobar".parse::<Version>().unwrap_err(),
                Err::Error(Error {
                    code: ErrorKind::TakeWhile1,
                    input: "foobar".to_string()
                })
            );
        }
    }
}
