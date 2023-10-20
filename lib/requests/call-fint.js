const axios = require('axios')
const { fint } = require('../../config')
const getFintToken = require('./fint-token')

/**
 * @param {string} payload - body of https request
 * @returns {object} result of request
 */
const fintGraph = async (payload, context) => {
  if (!payload) throw new Error('Missing required parameter "payload"')
  const token = await getFintToken(context)
  const { data } = await axios.post(`${fint.url}/graphql/graphql`, payload, { headers: { Authorization: `Bearer ${token}` } })
  return data
}

/**
 * @param {string} resource - body of https request
 * @returns {object} result of request
 */
const fintRest = async (resource, context) => {
  if (!resource) throw new Error('Missing required parameter "resource"')
  const token = await getFintToken(context)
  const { data } = await axios.get(`${fint.url}/${resource}`, { headers: { Authorization: `Bearer ${token}` } })
  return data
}

module.exports = { fintGraph, fintRest }
