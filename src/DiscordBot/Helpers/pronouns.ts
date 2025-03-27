const pronounIds = {
  aeaer: { name: "aeaer", subject: "Ae", object: "Aer", singular: false },
  any: { name: "any", subject: "Any", object: "Any", singular: true },
  eem: { name: "eem", subject: "E", object: "Em", singular: false },
  faefaer: { name: "faefaer", subject: "Fae", object: "Faer", singular: false },
  hehim: { name: "hehim", subject: "He", object: "Him", singular: false },
  itits: { name: "itits", subject: "It", object: "Its", singular: false },
  other: { name: "other", subject: "Other", object: "Other", singular: true },
  perper: { name: "perper", subject: "Per", object: "Per", singular: false },
  sheher: { name: "sheher", subject: "She", object: "Her", singular: false },

  theythem: {
    name: "theythem",
    subject: "They",
    object: "Them",
    singular: false,
  },
  vever: { name: "vever", subject: "Ve", object: "Ver", singular: false },
  xexem: { name: "xexem", subject: "Xe", object: "Xem", singular: false },
  ziehir: { name: "ziehir", subject: "Zie", object: "Hir", singular: false },
};

async function getPronouns(user: string): Promise<string> {
  try {
    const pronouns = await fetch(
      `https://api.pronouns.alejo.io/v1/users/${user}`
    ).then((res) => res.json());

    let pronounString = "";
    if (pronouns) {
      const altPronouns =
        pronounIds[pronouns.alt_pronoun_id as keyof typeof pronounIds];

      const mainPronouns =
        pronounIds[pronouns.pronoun_id as keyof typeof pronounIds];
      pronounString = ` (${mainPronouns.subject}/${
        altPronouns ? altPronouns.object : mainPronouns.object
      })`;
    }
    return pronounString;
  } catch (error) {
    return "";
  }
}

export default getPronouns;
