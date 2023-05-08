# azf-fint-folk-api
API for getting smoother data from FINT (easier usage)

# Endpoints
## /student/{identifikator}/{identifikatorverdi}
upn, feidenavn, fodselsnummer

### /teacher/{identifikator}/{identifikatorverdi}
upn, feidenavn

## /employee/{identifikator}/{identifikatorverdi}
upn, ansattnummer, fodselsnummer

## Employee

# Contribute
# Azure function setup
- Must have azure ad authentication enabled
- App reg representing the func must have application permission User.Read.All
- App reg needs to expose App roles as defined by roles in local.settings.json (e.g. "Teacher.Read")


