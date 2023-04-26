const axios = require('axios')
const { fint } = require('../config')
const getFintToken = require('./fint-token')

/**
 * @typedef {{beta: boolean}} FintOptions
 */

/**
 * @param {string} payload - body of https request
 * @param {FintOptions} [options]
 * @returns {object} result of request
 */
const fintGraph = async (payload, options) => {
  if (!payload) throw new Error('Missing required parameter "payload"')
  const token = await getFintToken()
  const { data } = await axios.post(`${options?.beta ? fint.betaUrl : fint.url}/graphql/graphql`, payload, { headers: { Authorization: `Bearer ${token}` } })
  return data
}

/**
 * @param {string} payload - body of https request
 * @param {FintOptions} [options]
 * @returns {object} result of request
 */
const fintRest = async (resource, options) => {
  if (!resource) throw new Error('Missing required parameter "resource"')
  const token = await getFintToken()
  const { data } = await axios.get(`${options?.beta ? fint.betaUrl : fint.url}/${resource}`, { headers: { Authorization: `Bearer ${token}` } })
  return data
}

module.exports = { fintGraph, fintRest }
