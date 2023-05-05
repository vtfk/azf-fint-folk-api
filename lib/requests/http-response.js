// Simple http response handler, handles axios error as well as plain js errors
module.exports = (statuscode, data) => {
  if (!statuscode) throw new Error('Missing required parameter "statuscode"')
  if (!data) throw new Error('Missing required parameter "data"')
  if (statuscode === 200) return { status: 200, body: data }

  const error = data.response?.data || data.stack || data.toString()
  const message = data.toString()
  return { status: statuscode, body: { message, data: error } }
}
