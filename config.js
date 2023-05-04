module.exports = {
  fint: {
    url: process.env.FINT_URL ?? 'url til fint prod miljø',
    betaUrl: process.env.FINT_BETA_URL ?? 'url til fint beta miljø',
    clientId: process.env.FINT_CLIENT_ID ?? 'klient id',
    clientSecret: process.env.FINT_CLIENT_SECRET ?? 'klient secret',
    username: process.env.FINT_USERNAME ?? 'klient brukernavn',
    password: process.env.FINT_PASSWORD ?? 'klient passord',
    tokenUrl: process.env.FINT_TOKEN_URL ?? 'url for å hente token',
    scope: process.env.FINT_SCOPE ?? 'scope for token'
  },
  roles: {
    teacherRead: process.env.ROLES_TEACHER_READ ?? 'Teacher.Read',
    employeeRead: process.env.ROLES_EMPLOYEE_READ ?? 'Employee.Read',
    studentRead: process.env.ROLES_EMPLOYEE_READ ?? 'Student.Read',
    personRead: process.env.ROLES_PERSON_READ ?? 'Person.Read',
  },
  graphClient: {
    clientId: process.env.GRAPH_CLIENT_ID ?? 'superId',
    clientSecret: process.env.GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
    tenantId: process.env.GRAPH_TENANT_ID ?? 'tenant id',
    scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup'
  },
  graphUrl: process.env.GRAPH_URL ?? 'url til graph',
  feidenavnDomain: process.env.FEIDENAVN_DOMAIN ?? '@domene.com',
  employeeNumberExtenstionAttribute: process.env.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE ?? 'extensionAttributeX'
}
