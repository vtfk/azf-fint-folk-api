# azf-fint-folk-api
API for getting smoother data from FINT (easier usage)

# Endpoints
## /student/{identifikator}/{identifikatorverdi}
upn, feidenavn, fodselsnummer

### /teacher/{identifikator}/{identifikatorverdi}
upn, feidenavn

## /employee/{identifikator}/{identifikatorverdi}
upn, ansattnummer, fodselsnummer

## /person/fodselsnummer/{fodselsnummer}
fodselsnummer

## /organization/{identfikator}/{identifikatorverdi}
organisasjonsId, organisasjonsKode

## /orgaization/structure
Nesta struktur for hele org

## /organization/flat
Flat liste med alle org-enheter. Sortert hierarkisk - det betyr at et element vil alltid komme etter et forelder-element (overordnet ligger alltid før underordnet i lista)


# Contribute
feel free
# Azure function setup
- Must have azure ad authentication enabled
- App reg representing the func must have application permission User.Read.All
- App reg needs to expose App roles as defined by roles in local.settings.json (e.g. "Teacher.Read")


