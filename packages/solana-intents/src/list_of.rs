use nom::{
    bytes::complete::tag, character::complete::space0, error::ParseError, multi::many1,
    sequence::preceded, AsChar, Compare, Input, Parser,
};

pub fn list_of<I, E, K, KO>(item: K) -> impl Parser<I, Output = Vec<KO>, Error = E>
where
    I: Input,
    I: Compare<&'static str>,
    <I as Input>::Item: AsChar,
    E: ParseError<I>,
    K: Parser<I, Output = KO, Error = E>,
{
    many1(preceded((space0, tag("-"), space0), item))
}

#[cfg(test)]
mod tests {
    use super::*;
    use nom::{character::complete::alpha1, error::Error};

    #[test]
    fn test_valid_list() {
        assert_eq!(
            list_of(alpha1::<_, Error<&str>>).parse("-foo-bar-baz"),
            Ok(("", vec!["foo", "bar", "baz"]))
        )
    }
}
