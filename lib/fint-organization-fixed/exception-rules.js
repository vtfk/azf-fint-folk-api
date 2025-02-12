const { feidenavnDomain, fint: { url } } = require('../../config')

const vfkExceptionRules = {
  // Sier spesifikt hvilken enhet som skal være neste tilsvarende lenke for en abstrakt enhet, i stedet for å følge struktur orgid+0 eller orgid+00 - altså hvilken vei skal vi gå nedover for å treffe korrekt tilsvarende enhet på bunnivå
  overrideNextProbableLink: {
    'O-39003-41': {
      navn: 'VGS Felles',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-401`, // 410 er Melsom vgs av en eller annen grunn
        navn: 'VGS felles'
      }
    },
    'O-39003-43': {
      navn: 'Voksenopplæring og karriereutvikling',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-439`,
        navn: 'Voksenopplæring og karriereutvikling'
      }
    },
    'O-39003-35': {
      navn: 'Hovedtillitsvalgte',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-335`,
        navn: 'Hovedtillitsvalgte'
      }
    }
  },
  // Sier spesifikt hvilke underenheter som skal dunkes inn i parent, og dermed fjernes fra strukturen (parent overtar underenhetene)
  absorbChildrenOverrides: {
    'O-39003-4': {
      navn: 'Opplæring og tannhelse',
      absorbChildren: [
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-42`,
          navn: 'Andre virksomheter'
        },
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-41`,
          navn: 'VGS Felles'
        }
      ]
    },
    'O-39003-42': {
      navn: 'Andre virksomheter',
      absorbChildren: [
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39003-435`,
          navn: 'Annen opplæring'
        }
      ]
    }
  },
  // Sier spesifikt hvilke enheter som IKKE krever en tilsvarende enhet på bunnivå - vær nu litt forsiktig med disse. Disse kommer altså til å KUN være abstrakte, og det er ikke noe gøy, men kreves f.eks for toppnivå
  allowNoCorrespondingBottomUnit: {
    'O-39003-39003': {
      navn: 'Vestfold Fylkeskommune' // Toppnivå
    }
  },
  // Sier spesifikt hvilke enheter som skal få manuell leder
  manualLeaders: {
    'O-39003-39003': {
      navn: 'Vestfold Fylkeskommune', // Toppnivå
      leader: {
        href: `${url}administrasjon/personal/personalressurs/ansattnummer/1036101` // Fylkesdirektør
      }
    }
  }
}

const tfkExceptionRules = {
  // Sier spesifikt hvilken enhet som skal være neste tilsvarende lenke for en abstrakt enhet, i stedet for å følge struktur orgid+0 eller orgid+00 - altså hvilken vei skal vi gå nedover for å treffe korrekt tilsvarende enhet på bunnivå
  overrideNextProbableLink: {
  },
  // Sier spesifikt hvilke underenheter som skal dunkes inn i parent, og dermed fjernes fra strukturen (parent overtar underenhetene)
  absorbChildrenOverrides: {
  },
  allowNoCorrespondingBottomUnit: {
  },
  manualLeaders: {
  }
}

const getExceptionRules = () => {
  if (feidenavnDomain.includes('vestfoldfylke')) return vfkExceptionRules
  if (feidenavnDomain.includes('telemarkfylke')) return tfkExceptionRules
  return { // Return default rules for consistent return type
    overrideNextProbableLink: {},
    absorbChildrenOverrides: {},
    allowNoCorrespondingBottomUnit: {},
    manualLeaders: {}
  }
}

module.exports = { getExceptionRules }
