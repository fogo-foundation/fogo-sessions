use nom::combinator::opt;
use nom::{error::ParseError, AsChar, Compare, Input, Parser};

use nom::{branch::alt, character::complete::line_ending, combinator::eof, sequence::terminated};

pub fn line<I, E, O, K>(item: K) -> impl Parser<I, Output = O, Error = E>
where
    I: Input,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    K: Parser<I, Output = O, Error = E>,
{
    terminated(item, alt((line_ending, eof)))
}

#[cfg(test)]
mod tests {
    use super::*;
    use nom::{character::complete::alpha1, error::Error};

    #[test]
    fn test_eof() {
        assert_eq!(line(alpha1::<_, Error<&str>>).parse("foo"), Ok(("", "foo")))
    }

    #[test]
    fn test_line() {
        assert_eq!(
            line(alpha1::<_, Error<&str>>).parse("foo\nbar"),
            Ok(("bar", "foo"))
        )
    }
}
