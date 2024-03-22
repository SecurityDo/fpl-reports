// given an s3 object path, divided to two parts: prefix and suffix
// the prefix is strictly ascending ordered by time. 
// the suffix contains random characters
(object) => {
   return regexp(`(?P<prefix>.*)(?P<suffix>_[0-9a-zA-Z]+.json.gz)`, object) 
}
