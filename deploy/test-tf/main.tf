resource "aws_s3_bucket" "training_private_bucket1" {
  bucket = "loic-test-bucket123"
  acl    = "private"
}
