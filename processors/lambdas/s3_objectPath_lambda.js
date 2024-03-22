// object path lambda for S3 datasink.
// sample object path: data/20240227/141809.550038.log.gz
() =>  {
   let t = new Time()
   return t.Format("data/20060102/150405.999999.log.gz")
}
