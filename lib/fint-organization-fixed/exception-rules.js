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
  // Sier spesifikt hvilke enheter som IKKE skal gå videre for å finne noen tilsvarende enhet på bunnivå - vær nu litt forsiktig med disse. Disse kommer altså til å KUN være abstrakte. Det bør ikke være mange av disse altså, da må vi snakke med HR...
  useAbstractAsUnitOverride: {
    'O-39003-39003': {
      navn: 'Vestfold Fylkeskommune' // Toppnivå - har ingen bunnenhet
    },
    'O-39003-42': {
      navn: 'Andre virksomheter' // Har ingen bunnenhet. Absorberes også av Opplæring og tannhelse - derav ok her
    },
    'O-39003-435': {
      navn: 'Annen opplæring' // Denne har ingen tilsvarende enhet på bunnivå, og peker i tillegg galt på Lærlingskolen (adm. FRV) som seg selv på undernivå... Håper ikke vi trenger flere av denne regelen gitt. Skal også absorberes av Andre virksomheter (som igjen blir absorbert av OPT)
    }
  },
  // Sier spesifikt hvilke enheter som har lov til å ha forskjellige navn gjennom de abstrakte nivåene ned til bunnivå
  nameChainOverride: {
    'O-39003-16': {
      navn: 'Tilskudd til politiske partier',
      allowedNameChain: ['Tilskudd til politiske partier', 'Tilskudd til politisk partier', 'Tilskudd til politiske partier']
    },
    'O-39003-437': {
      navn: 'Opplæring i kriminalomsorgen - adm. HORV',
      allowedNameChain: ['Opplæring i kriminalomsorgen - adm. HORV', 'Opplæring i Kriminalomsorgen- Horten/Bastøy']
    },
    'O-39003-47': {
      navn: 'Oppfølgingstjeneste/Pedagogisk-psykologisk tjeneste',
      allowedNameChain: ['Oppfølgingstjeneste/Pedagogisk-psykologisk tjeneste', 'OT og PPT', 'OT og PPT']
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
  manualLeaders: {
  }
  /* VENTER MED DENNE! Vil egt ikke klusse med de dataene...
  // Sier spesifikt hvilke enheter som skal få manuell leder
  manualLeaders: {
    'O-39003-39003': {
      navn: 'Vestfold Fylkeskommune', // Toppnivå
      leader: {
        href: `${url}/administrasjon/personal/personalressurs/ansattnummer/1036101` // Fylkesdirektør
      }
    }
  } */
}

const tfkExceptionRules = {
  // Sier spesifikt hvilken enhet som skal være neste tilsvarende lenke for en abstrakt enhet, i stedet for å følge struktur orgid+0 eller orgid+00 - altså hvilken vei skal vi gå nedover for å treffe korrekt tilsvarende enhet på bunnivå
  overrideNextProbableLink: {
    'O-39006-1A': {
      navn: 'Politisk ledelse',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-17`,
        navn: 'Politisk ledelse og politiske utvalg'
      }
    },
    'O-39006-1B': {
      navn: 'Fylkesdirektør',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-10`,
        navn: 'Fylkesdirektør'
      }
    },
    'O-39006-1C': {
      navn: 'Fylkeskommunale fellesutgifter',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-12`,
        navn: 'Fylkeskommunale fellesutgifter'
      }
    },
    'O-39006-4151': {
      navn: 'Hjalmar Johansen vgs - elevkantine',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-415051`,
        navn: 'Hjalmar Johansen vgs elevkantine'
      }
    },
    'O-39006-4152': {
      navn: 'Hjalmar Johansen vgs - restaurant og matfag',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-415022`,
        navn: 'Hjalmar Johansen vgs restaurant og matfag'
      }
    },
    'O-39006-4191': {
      navn: 'Nome vgs - Søve elevkantine',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419112`,
        navn: 'Nome vgs kantine Søve'
      }
    },
    'O-39006-4192': {
      navn: 'Nome vgs - Lunde elevkantine',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419212`,
        navn: 'Nome vgs kantine Lunde'
      }
    },
    'O-39006-4211': {
      navn: 'Notodden vgs - ressurssenter',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-421140`,
        navn: 'Notodden vgs ressurssenter'
      }
    },
    'O-39006-4292': {
      navn: 'Skogmo vgs - elektro',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429201`,
        navn: 'Skogmo vgs elektrofag'
      }
    },
    'O-39006-4293': {
      navn: 'Skogmo vgs - bygg',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429301`,
        navn: 'Skogmo vgs bygg og anleggsfag'
      }
    },
    'O-39006-4294': {
      navn: 'Skogmo vgs - TEK/Realfag',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429401`,
        navn: 'Skogmo vgs TEK og realfag'
      }
    },
    'O-39006-4295': {
      navn: 'Skogmo vgs - fellesfag',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429501`,
        navn: 'Skogmo vgs fellesfag'
      }
    },
    'O-39006-4296': {
      navn: 'Skogmo vgs - pedagogisk støtte',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429601`,
        navn: 'Skogmo vgs tilrettelagt opplæring'
      }
    },
    'O-39006-4298': {
      navn: 'Skogmo vgs - HO vg2-3',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429801`,
        navn: 'Skogmo vgs helse og oppvekst VG 2-3'
      }
    },
    'O-39006-4299': {
      navn: 'Skogmo vgs - OIK',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-429901`,
        navn: 'Skogmo vgs opplæring i kriminalomsorgen'
      }
    },
    'O-39006-1600': {
      navn: 'Fagskolen Vestfold og Telemark',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-160001`,
        navn: 'Fagskolen Vestfold og Telemark'
      }
    },
    'O-39006-4193': {
      navn: 'Nome vgs - bygg, anlegg og tek',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419024`,
        navn: 'Nome vgs bygg og anlegg, TEK'
      }
    },
    'O-39006-4194': {
      navn: 'Nome vgs - FBIE, frisør og helse',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419023`,
        navn: 'Nome vgs FBIE, helse- og oppvekstfag'
      }
    },
    'O-39006-4195': {
      navn: 'Nome vgs - elektro og fellesfag',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419020`,
        navn: 'Nome vgs fellesfag og elektro'
      }
    },
    'O-39006-4199': {
      navn: 'Nome vgs pedagogisk støtte og elevtjenester',
      nextLink: {
        href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-419030`,
        navn: 'Nome vgs elevtjenester'
      }
    }
  },
  useAbstractAsUnitOverride: {
    'O-39006-39006': {
      navn: 'Telemark Fylkeskommune' // Toppnivå - har ingen bunnenhet
    },
    'O-39006-4297': {
      navn: 'Skogmo vgs - HO vg1/VOV' // Denne har to underenheter, helse og oppvekst, og voksenopplæring. Vi tester å la den være abstrakt siden den ser ut til å være overordnet de to over
    },
    'O-39006-4196': {
      navn: 'Nome vgs - naturbruk skole' // Denne har to underenheter, programfag og fellesfag, og ser ut til å være en faktisk overordnet enhet
    },
    'O-39006-4197': {
      navn: 'Nome vgs - naturbruk gårdsbruk' // Denne har to underenheter, gårdsbruk I og gårdsbruk II, og ser ut til å være en faktisk overordnet enhet
    },
    'O-39006-4198': {
      navn: 'Nome vgs - drift og administrasjon' // Denne har to underenheter, administrasjon og renhold/vaktmester, og ser ut til å være en faktisk overordnet enhet
    }
  },
  nameChainOverride: {
    'O-39006-1A': {
      navn: 'Politisk ledelse',
      allowedNameChain: [
        'Politisk ledelse',
        'Politisk ledelse og politiske utvalg',
        'Politisk ledelse og politiske utvalg',
        'Politisk ledelse og politiske utvalg',
        'Politisk ledelse og politiske utvalg'
      ]
    },
    'O-39006-1B': {
      navn: 'Fylkesdirektør',
      allowedNameChain: [
        'Fylkesdirektør',
        'Fylkesdirektør',
        'Fylkesdirektør',
        'Fylkesdirektør',
        'Fylkesdirektør avdeling'
      ]
    },
    'O-39006-11': {
      navn: 'Fylkesadvokatkontor',
      allowedNameChain: [
        'Fylkesadvokatkontor',
        'Fylkesadvokatkontor',
        'Fylkesadvokatkontor',
        'Fylkesadvokatkontor avdeling'
      ]
    },
    'O-39006-1C': {
      navn: 'Fylkeskommunale fellesutgifter',
      allowedNameChain: [
        'Fylkeskommunale fellesutgifter',
        'Fylkeskommunale fellesutgifter',
        'Fellesutgifter',
        'Fylkeskommunale fellesutgifter'
      ]
    },
    'O-39006-1620': {
      navn: 'Fagskolen elektrofag Horten',
      allowedNameChain: [
        'Fagskolen elektrofag Horten',
        'Fagskolen elektro'
      ]
    },
    'O-39006-1621': {
      navn: 'Fagskolen helse- og ledelsesfag Horten',
      allowedNameChain: [
        'Fagskolen helse- og ledelsesfag Horten',
        'Fagskolen helsefag'
      ]
    },
    'O-39006-1622': {
      navn: 'Fagskolen maritim utdanning Horten',
      allowedNameChain: [
        'Fagskolen maritim utdanning Horten',
        'Fagskolen maritim utdanning'
      ]
    },
    'O-39006-3210': {
      navn: 'Drift Telemarkshuset Skien',
      allowedNameChain: [
        'Drift Telemarkshuset Skien',
        'Drift administrasjonsbygg'
      ]
    },
    'O-39006-41': {
      navn: 'Videregående skoler',
      allowedNameChain: [
        'Videregående skoler',
        'VGS felles',
        'VGS felles'
      ]
    },
    'O-39006-4151': {
      navn: 'Hjalmar Johansen vgs - elevkantine',
      allowedNameChain: [
        'Hjalmar Johansen vgs - elevkantine',
        'Hjalmar Johansen vgs elevkantine'
      ]
    },
    'O-39006-4152': {
      navn: 'Hjalmar Johansen vgs - restaurant og matfag',
      allowedNameChain: [
        'Hjalmar Johansen vgs - restaurant og matfag',
        'Hjalmar Johansen vgs restaurant og matfag'
      ]
    },
    'O-39006-4191': {
      navn: 'Nome vgs - Søve elevkantine',
      allowedNameChain: [
        'Nome vgs - Søve elevkantine',
        'Nome vgs kantine Søve'
      ]
    },
    'O-39006-4192': {
      navn: 'Nome vgs - Lunde elevkantine',
      allowedNameChain: [
        'Nome vgs - Lunde elevkantine',
        'Nome vgs kantine Lunde'
      ]
    },
    'O-39006-4193': {
      navn: 'Nome vgs - bygg, anlegg og tek',
      allowedNameChain: [
        'Nome vgs - bygg, anlegg og tek',
        'Nome vgs bygg og anlegg, TEK'
      ]
    },
    'O-39006-4194': {
      navn: 'Nome vgs - FBIE, frisør og helse',
      allowedNameChain: [
        'Nome vgs - FBIE, frisør og helse',
        'Nome vgs FBIE, helse- og oppvekstfag'
      ]
    },
    'O-39006-4195': {
      navn: 'Nome vgs - elektro og fellesfag',
      allowedNameChain: [
        'Nome vgs - elektro og fellesfag',
        'Nome vgs fellesfag og elektro'
      ]
    },
    'O-39006-4199': {
      navn: 'Nome vgs pedagogisk støtte og elevtjenester',
      allowedNameChain: [
        'Nome vgs pedagogisk støtte og elevtjenester',
        'Nome vgs elevtjenester'
      ]
    },
    'O-39006-4211': {
      navn: 'Notodden vgs - ressurssenter',
      allowedNameChain: [
        'Notodden vgs - ressurssenter',
        'Notodden vgs ressurssenter'
      ]
    },
    'O-39006-4292': {
      navn: 'Skogmo vgs - elektro',
      allowedNameChain: [
        'Skogmo vgs - elektro',
        'Skogmo vgs elektrofag'
      ]
    },
    'O-39006-4293': {
      navn: 'Skogmo vgs - bygg',
      allowedNameChain: [
        'Skogmo vgs - bygg',
        'Skogmo vgs bygg og anleggsfag'
      ]
    },
    'O-39006-4294': {
      navn: 'Skogmo vgs - TEK/Realfag',
      allowedNameChain: [
        'Skogmo vgs - TEK/Realfag',
        'Skogmo vgs TEK og realfag'
      ]
    },
    'O-39006-4295': {
      navn: 'Skogmo vgs - fellesfag',
      allowedNameChain: [
        'Skogmo vgs - fellesfag',
        'Skogmo vgs fellesfag'
      ]
    },
    // OBS, kanskje sjekke denne?
    'O-39006-4296': {
      navn: 'Skogmo vgs - pedagogisk støtte',
      allowedNameChain: [
        'Skogmo vgs - pedagogisk støtte',
        'Skogmo vgs tilrettelagt opplæring'
      ]
    },
    'O-39006-4298': {
      navn: 'Skogmo vgs - HO vg2-3',
      allowedNameChain: [
        'Skogmo vgs - HO vg2-3',
        'Skogmo vgs helse og oppvekst VG 2-3'
      ]
    },
    'O-39006-4299': {
      navn: 'Skogmo vgs - OIK',
      allowedNameChain: [
        'Skogmo vgs - OIK',
        'Skogmo vgs opplæring i kriminalomsorgen'
      ]
    },
    'O-39006-4410': {
      navn: 'Pedagogisk psykologisk tjeneste (PPT)',
      allowedNameChain: [
        'Pedagogisk psykologisk tjeneste (PPT)',
        'Pedagogisk psykologisk tjeneste'
      ]
    },
    'O-39006-4420': {
      navn: 'Oppfølgingstjenesten (OT)',
      allowedNameChain: [
        'Oppfølgingstjenesten (OT)',
        'Oppfølgingstjenesten'
      ]
    },
    'O-39006-484': {
      navn: 'Midt Telemark klinikk',
      allowedNameChain: [
        'Midt Telemark klinikk',
        'Midt-Telemark tannklinikk',
        'Midt-Telemark tannklinikk'
      ]
    },
    'O-39006-5': {
      navn: 'Samferdsel',
      allowedNameChain: [
        'Samferdsel',
        'Samferdsel',
        'Samferdsel',
        'Fylkessjef for Samferdsel',
        'Samferdsel'
      ]
    },
    'O-39006-51': {
      navn: 'Seksjon vegforvaltning og transport',
      allowedNameChain: [
        'Seksjon vegforvaltning og transport',
        'Vegforvaltning og transport',
        'Vegforvaltning og transport',
        'Vegforvaltning og transport'
      ]
    },
    'O-39006-52': {
      navn: 'Seksjon vegdrift',
      allowedNameChain: [
        'Seksjon vegdrift',
        'Vegdrift',
        'Vegdrift',
        'Vegdrift'
      ]
    },
    'O-39006-5210': {
      navn: 'Team driftskontrakter veg',
      allowedNameChain: [
        'Team driftskontrakter veg',
        'Driftskontrakt veg'
      ]
    },
    'O-39006-5220': { // Har bare en underordnet inntil videre, så vi godtar den enn så lenge
      navn: 'Team vedlikehold',
      allowedNameChain: [
        'Team vedlikehold',
        'Elektro, asfalt, vegoppmerking og bru'
      ]
    },
    'O-39006-53': {
      navn: 'Seksjon vegutbygging',
      allowedNameChain: [
        'Seksjon vegutbygging',
        'Vegutbygging',
        'Driftsbudsjett - seksjonsleder Vegutbygging',
        'Vegutbygging'
      ]
    },
    'O-39006-5310': {
      navn: 'Driftsbudsjett - team Prosjektstøtte',
      allowedNameChain: [
        'Driftsbudsjett - team Prosjektstøtte',
        'Prosjektstøtte'
      ]
    },
    'O-39006-5320': {
      navn: 'Driftsbudsjett - team Plan og bygging',
      allowedNameChain: [
        'Driftsbudsjett - team Plan og bygging',
        'Plan og bygging'
      ]
    },
    'O-39006-54': {
      navn: 'Seksjon kollektiv',
      allowedNameChain: [
        'Seksjon kollektiv',
        'Kollektiv',
        'Kollektiv',
        'Kollektiv'
      ]
    },
    'O-39006-5410': {
      navn: 'Skoleskyss og drosjeløyver',
      allowedNameChain: [
        'Skoleskyss og drosjeløyver',
        'Skoleskyss, TT og løyver'
      ]
    },
    'O-39006-6220': {
      navn: 'Den kulturelle skolesekken (DKS)',
      allowedNameChain: [
        'Den kulturelle skolesekken (DKS)',
        'Den kulturelle skolesekken'
      ]
    },
    'O-39006-6230': {
      navn: 'Regional bibliotekutvikling',
      allowedNameChain: [
        'Regional bibliotekutvikling',
        'Bibliotek'
      ]
    },
    'O-39006-6310': {
      navn: 'Klima, miljø og internasjonalt arbeid',
      allowedNameChain: [
        'Klima, miljø og internasjonalt arbeid',
        'Klima, miljø og internasjonalt'
      ]
    }
  },
  // Sier spesifikt hvilke underenheter som skal dunkes inn i parent, og dermed fjernes fra strukturen (parent overtar underenhetene)
  absorbChildrenOverrides: {
    'O-39006-4': {
      navn: 'Utdanning, folkehelse og tannhelse',
      absorbChildren: [
        {
          href: `${url}/administrasjon/organisasjon/organisasjonselement/organisasjonsid/O-39006-41`,
          navn: 'Videregående skoler'
        }
      ]
    }
  },
  manualLeaders: {
  }
}

const getExceptionRules = () => {
  if (feidenavnDomain.includes('vestfoldfylke')) return vfkExceptionRules
  if (feidenavnDomain.includes('telemarkfylke')) return tfkExceptionRules
  return { // Return default rules for consistent return type
    overrideNextProbableLink: {},
    useAbstractAsUnitOverride: {},
    nameChainOverride: {},
    absorbChildrenOverrides: {},
    manualLeaders: {}
  }
}

module.exports = { getExceptionRules }
