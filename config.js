module.exports = {
  fint: {
    url: process.env.FINT_URL ?? 'url til fint miljø',
    clientId: process.env.FINT_CLIENT_ID ?? 'klient id',
    clientSecret: process.env.FINT_CLIENT_SECRET ?? 'klient secret',
    username: process.env.FINT_USERNAME ?? 'klient brukernavn',
    password: process.env.FINT_PASSWORD ?? 'klient passord',
    tokenUrl: process.env.FINT_TOKEN_URL ?? 'url for å hente token',
    scope: process.env.FINT_SCOPE ?? 'scope for token'
  },
  roles: {
    readAll: process.env.ROLES_READ_ALL ?? 'Read.All',
    teacherRead: process.env.ROLES_TEACHER_READ ?? 'Teacher.Read',
    employeeRead: process.env.ROLES_EMPLOYEE_READ ?? 'Employee.Read',
    studentRead: process.env.ROLES_STUDENT_READ ?? 'Student.Read',
    personRead: process.env.ROLES_PERSON_READ ?? 'Person.Read',
    organizationRead: process.env.ROLES_ORGANIZATION_READ ?? 'Organization.Read'
  },
  graphClient: {
    clientId: process.env.GRAPH_CLIENT_ID ?? 'superId',
    clientSecret: process.env.GRAPH_CLIENT_SECRET ?? 'hemmelig hemmelig',
    tenantId: process.env.GRAPH_TENANT_ID ?? 'tenant id',
    scope: process.env.GRAPH_SCOPE ?? 'etSkikkeligSkuup'
  },
  responseCache: {
    ttl: (process.env.RESPONSE_CACHE_TTL && Number(process.env.RESPONSE_CACHE_TTL)) ?? 3600, // Seconds
    enabled: process.env.RESPONSE_CACHE_ENABLED || true
  },
  graphUrl: process.env.GRAPH_URL ?? 'url til graph',
  feidenavnDomain: process.env.FEIDENAVN_DOMAIN ?? '@domene.com',
  studentUpnSuffix: process.env.STUDENT_UPN_SUFFIX ?? '@skole.fylke.no',
  employeeNumberExtenstionAttribute: process.env.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE ?? 'extensionAttributeX',
  topUnitId: process.env.TOP_UNIT_ID ?? 'hoved'
}
