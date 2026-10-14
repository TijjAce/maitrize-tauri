//! Les prénoms des élèves, que Whisper entend mal.
//!
//! Un prénom rare, le modèle l'écrit comme il l'entend : d'un bilan à
//! l'autre, le même élève prenait trois orthographes. Lui montrer les
//! prénoms de la classe avant l'audio les fait écrire juste — mais, sur un
//! son moins net, le modèle ainsi guidé réécrit parfois toute la phrase
//! autour du prénom. Une phrase inventée n'a pas sa place dans le dossier
//! d'un élève.
//!
//! On garde donc la première écoute telle quelle. Quand elle a écrit un mot
//! qui se dit comme le prénom d'un élève sans l'être, le même passage se
//! réécoute, guidé par ce prénom-là, et l'on ne prend de la seconde écoute
//! que les prénoms : un mot n'est remplacé que si elle met un élève de la
//! classe à sa place, et que les deux se ressemblent à l'oreille.

use std::collections::HashMap;

/// Un mot ramené à ses lettres : minuscules, sans accent ni ponctuation.
pub fn forme(mot: &str) -> String {
    let mut sortie = String::with_capacity(mot.len());
    for c in mot.chars().flat_map(char::to_lowercase) {
        match c {
            'à' | 'â' | 'ä' | 'á' | 'ã' | 'å' => sortie.push('a'),
            'é' | 'è' | 'ê' | 'ë' => sortie.push('e'),
            'î' | 'ï' | 'í' | 'ì' => sortie.push('i'),
            'ô' | 'ö' | 'ó' | 'ò' | 'õ' => sortie.push('o'),
            'ù' | 'û' | 'ü' | 'ú' => sortie.push('u'),
            'ÿ' | 'ý' => sortie.push('y'),
            'ç' => sortie.push('c'),
            'ñ' => sortie.push('n'),
            'œ' => sortie.push_str("oe"),
            'æ' => sortie.push_str("ae"),
            c if c.is_alphanumeric() => sortie.push(c),
            _ => {}
        }
    }
    sortie
}

/**
 * Ce qu'on entend d'un mot : ses consonnes, les sourdes et les sonores
 * confondues, sans ses finales muettes.
 *
 * « Thanh », « Tan », « Tang », « Than » et « Tân » ont le même : ce sont
 * les façons dont le modèle écrit ce prénom quand il ne le connaît pas.
 */
pub fn squelette(mot: &str) -> String {
    let mut lettres: Vec<char> = forme(mot).chars().filter(char::is_ascii_alphabetic).collect();
    // Une lettre doublée ne se dit qu'une fois : « Anne » comme « Ane ».
    lettres.dedup();
    if lettres.ends_with(&['n', 'g']) {
        lettres.pop();
    }
    while lettres.len() > 1 && matches!(lettres.last(), Some('s' | 't' | 'd' | 'x' | 'z' | 'e')) {
        lettres.pop();
    }
    let mut sons = String::new();
    let mut precedent: Option<char> = None;
    let mut i = 0;
    while i < lettres.len() {
        // Le son, et s'il prend aussi la lettre d'après (« qu », « ch »…).
        let (son, deux) = match (lettres[i], lettres.get(i + 1).copied()) {
            ('q' | 'g', Some('u')) => (Some('k'), true),
            ('c' | 's', Some('h')) => (Some('s'), true),
            ('p', Some('h')) => (Some('f'), true),
            ('t', Some('h')) => (Some('t'), true),
            ('g', Some('n')) => (Some('n'), true),
            ('c' | 'g', Some('e' | 'i' | 'y')) => (Some('s'), false),
            ('c' | 'g' | 'q' | 'k', _) => (Some('k'), false),
            ('b', _) => (Some('p'), false),
            ('d', _) => (Some('t'), false),
            ('v', _) => (Some('f'), false),
            ('z' | 'j' | 'x', _) => (Some('s'), false),
            ('a' | 'e' | 'i' | 'o' | 'u' | 'y' | 'h' | 'w', _) => (None, false),
            (c, _) => (Some(c), false),
        };
        if let Some(s) = son.filter(|s| precedent != Some(*s)) {
            sons.push(s);
        }
        precedent = son;
        i += if deux { 2 } else { 1 };
    }
    sons
}

fn distance(a: &str, b: &str) -> usize {
    let b: Vec<char> = b.chars().collect();
    let mut ligne: Vec<usize> = (0..=b.len()).collect();
    for (i, x) in a.chars().enumerate() {
        let mut diagonale = ligne[0];
        ligne[0] = i + 1;
        for (j, y) in b.iter().enumerate() {
            let haut = ligne[j + 1];
            ligne[j + 1] = (diagonale + usize::from(x != *y)).min(haut + 1).min(ligne[j] + 1);
            diagonale = haut;
        }
    }
    ligne[b.len()]
}

/**
 * Deux mots qui se disent pareil : les mêmes consonnes, ou, pour deux noms
 * longs, une seule qui change.
 *
 * Pas davantage : guidé par deux prénoms proches, le modèle a écrit l'un là
 * où l'on disait l'autre, et une règle plus large aurait mis l'observation
 * d'un élève au nom d'un autre.
 */
pub fn se_ressemblent(a: &str, b: &str) -> bool {
    let (x, y) = (squelette(a), squelette(b));
    if x.is_empty() || y.is_empty() {
        return false;
    }
    x == y || (x.len().min(y.len()) >= 4 && distance(&x, &y) <= 1)
}

/**
 * Des mots qu'un prénom ne remplace jamais, même en tête de phrase.
 *
 * Guidé par « Thanh », le modèle entend volontiers « Thanh » dans « Tant
 * pis… » : la majuscule d'un début de phrase ne fait pas d'un mot de tous
 * les jours un prénom mal écrit.
 */
const MOTS_COURANTS: &[&str] = &[
    "a", "ai", "alors", "apres", "apresmidi", "atelier", "au", "aujourdhui", "aussi", "autre", "aux", "avant",
    "avec", "avoir", "bah", "beaucoup", "ben", "bien", "bon", "bonne", "bravo", "c", "ca", "car", "ce", "ceci",
    "cela", "celle", "celui", "ces", "cest", "cet", "cette", "chacun", "chaque", "chez", "classe", "comme",
    "comment", "d", "dabord", "dans", "de", "demain", "depuis", "des", "deux", "dimanche", "doit", "donc", "du",
    "elle", "elles", "en", "encore", "enfin", "ensemble", "ensuite", "entre", "est", "et", "etait", "euh", "fait",
    "faut", "groupe", "hier", "ici", "il", "ils", "j", "jai", "je", "jeu", "jeudi", "l", "la", "le", "les", "leur",
    "leurs", "lui", "lundi", "m", "ma", "mais", "mardi", "matin", "me", "meme", "mercredi", "mes", "midi", "moi",
    "moins", "mon", "n", "ne", "ni", "non", "nos", "notre", "nous", "ok", "on", "ont", "ou", "oui", "par", "parce",
    "pas", "pendant", "peu", "peut", "plus", "plusieurs", "pour", "pourquoi", "pourtant", "puis", "quand", "que",
    "quel", "quelle", "quelque", "quelques", "qui", "quoi", "rien", "s", "sa", "samedi", "sans", "se", "seance",
    "ses", "seul", "si", "son", "sont", "sous", "sur", "ta", "tant", "tes", "toi", "ton", "toujours", "tous",
    "tout", "toute", "toutes", "tres", "trop", "tu", "un", "une", "va", "vendredi", "vers", "voila", "vous", "y",
];

/// Les élèves tels qu'on les reconnaît : la forme de chaque nom et de chacun
/// de ses mots, et comment chacune s'écrit.
struct Classe {
    ecrits: HashMap<String, String>,
    /// Les noms entiers, dans l'ordre de la liste.
    noms: Vec<String>,
}

impl Classe {
    fn de(noms: &[String]) -> Self {
        let mut ecrits = HashMap::new();
        let mut entiers: Vec<String> = Vec::new();
        for nom in noms {
            let nom = crate::whisper_embarque::comme_un_prenom(nom);
            if !forme(&nom).chars().any(char::is_alphabetic) {
                continue;
            }
            for mot in nom.split(|c: char| c.is_whitespace() || c == ',').filter(|m| !m.is_empty()) {
                ecrits.entry(forme(mot)).or_insert_with(|| mot.to_string());
            }
            // « Lou-Anne » s'écrit aussi d'un seul mot.
            ecrits.entry(forme(&nom)).or_insert_with(|| nom.clone());
            if !entiers.contains(&nom) {
                entiers.push(nom);
            }
        }
        ecrits.retain(|f, _| f.chars().any(char::is_alphabetic));
        Self { ecrits, noms: entiers }
    }

    fn connait(&self, mot: &str) -> bool {
        self.ecrits.contains_key(&forme(mot))
    }

    /// Un mot qui pourrait être un prénom mal écrit : une majuscule, ni un
    /// élève ni un mot de tous les jours.
    fn douteux(&self, mot: &str) -> bool {
        let f = forme(mot);
        mot.chars().find(|c| c.is_alphabetic()).is_some_and(char::is_uppercase)
            && f.chars().any(char::is_alphabetic)
            && !self.ecrits.contains_key(&f)
            && !MOTS_COURANTS.contains(&f.as_str())
    }

    /// Le nom entier dont ce mot pourrait être l'un des mots, ou le tout.
    fn proche(&self, mot: &str, nom: &str) -> bool {
        se_ressemblent(mot, nom)
            || nom.split(|c: char| c.is_whitespace() || c == ',' || c == '-').filter(|m| !m.is_empty()).any(|m| se_ressemblent(mot, m))
    }
}

/**
 * Les élèves dont la première écoute a pu mal écrire le nom : ceux qui se
 * disent comme un mot douteux de son texte. Vide, une écoute suffit.
 *
 * Ce sont eux seuls qu'on montre à la seconde écoute. Toute la classe à la
 * fois, le modèle s'y perd et laisse le prénom mal écrit ; guidé par le seul
 * prénom qui se dit comme le mot douteux, il l'écrit juste.
 */
pub fn prenoms_proches(entendu: &str, noms: &[String]) -> Vec<String> {
    let classe = Classe::de(noms);
    let douteux: Vec<&str> = entendu.split_whitespace().filter(|m| classe.douteux(m)).collect();
    classe.noms.iter().filter(|nom| douteux.iter().any(|m| classe.proche(m, nom))).cloned().collect()
}

/// Ce qui entoure les lettres d'un mot : « (Tan), » → (« ( », « Tan », « ), »).
fn decouper(mot: &str) -> (&str, &str, &str) {
    let debut = mot.find(char::is_alphanumeric).unwrap_or(mot.len());
    let fin = mot.rfind(char::is_alphanumeric).map(|i| i + mot[i..].chars().next().map_or(1, char::len_utf8)).unwrap_or(debut);
    (&mot[..debut], &mot[debut..fin.max(debut)], &mot[fin.max(debut)..])
}

/**
 * La première écoute, avec les prénoms de la seconde.
 *
 * Les deux textes s'alignent mot à mot. Un mot de la première n'est remplacé
 * que si la seconde met un élève à sa place, qu'il est douteux (voir
 * `Classe::douteux`) et qu'il se dit comme ce prénom ; sa ponctuation reste.
 * Tout le reste de la première écoute reste tel quel, même quand la seconde
 * a écrit autre chose.
 */
pub fn corriger_les_noms(entendu: &str, guide: &str, noms: &[String]) -> String {
    let classe = Classe::de(noms);
    let a: Vec<&str> = entendu.split_whitespace().collect();
    let b: Vec<&str> = guide.split_whitespace().collect();
    if a.is_empty() || b.is_empty() || classe.ecrits.is_empty() {
        return entendu.to_string();
    }
    let fa: Vec<String> = a.iter().map(|m| forme(m)).collect();
    let fb: Vec<String> = b.iter().map(|m| forme(m)).collect();
    // Le coût d'aligner deux mots : nul s'ils sont pareils, faible pour un
    // prénom et ce qui s'en approche — pour que l'alignement les apparie —,
    // plein sinon ; sauter un mot coûte autant qu'en changer.
    let cout = |i: usize, j: usize| -> usize {
        if fa[i] == fb[j] {
            0
        } else if classe.connait(b[j]) && se_ressemblent(a[i], b[j]) {
            1
        } else {
            2
        }
    };
    let (n, m) = (a.len(), b.len());
    let mut d = vec![vec![0usize; m + 1]; n + 1];
    for (i, ligne) in d.iter_mut().enumerate() {
        ligne[0] = 2 * i;
    }
    for (j, case) in d[0].iter_mut().enumerate() {
        *case = 2 * j;
    }
    for i in 1..=n {
        for j in 1..=m {
            d[i][j] = (d[i - 1][j - 1] + cout(i - 1, j - 1)).min(d[i - 1][j] + 2).min(d[i][j - 1] + 2);
        }
    }
    let mut remplacements: Vec<(usize, usize)> = Vec::new();
    let (mut i, mut j) = (n, m);
    while i > 0 && j > 0 {
        let c = cout(i - 1, j - 1);
        if d[i][j] == d[i - 1][j - 1] + c {
            if c == 1 && classe.douteux(a[i - 1]) {
                remplacements.push((i - 1, j - 1));
            }
            i -= 1;
            j -= 1;
        } else if d[i][j] == d[i - 1][j] + 2 {
            i -= 1;
        } else {
            j -= 1;
        }
    }
    let mut mots: Vec<String> = a.iter().map(|m| m.to_string()).collect();
    for (i, j) in remplacements {
        let (avant, _, apres) = decouper(a[i]);
        let prenom = &classe.ecrits[&fb[j]];
        mots[i] = format!("{avant}{prenom}{apres}");
    }
    mots.join(" ")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn classe() -> Vec<String> {
        ["THANH", "Siaka", "Lou-Anne", "MATHIS", "Ines"].iter().map(|n| n.to_string()).collect()
    }

    #[test]
    fn les_facons_d_ecrire_un_prenom_se_disent_pareil() {
        for mal_ecrit in ["Tan", "Tang", "Than", "Tân", "Thân"] {
            assert_eq!(squelette(mal_ecrit), squelette("Thanh"), "{mal_ecrit}");
        }
        for mal_ecrit in ["Kwan", "Kouane", "Gwan", "Couane"] {
            assert_eq!(squelette(mal_ecrit), squelette("Kwan"), "{mal_ecrit}");
        }
        assert_eq!(squelette("Shiaka"), squelette("Siaka"));
        assert_eq!(squelette("Inès"), squelette("Ines"));
        assert!(se_ressemblent("Tan", "Thanh"));
        assert!(se_ressemblent("Matisse", "Mathis"));
        assert!(se_ressemblent("Estevan", "Esteban"));
        assert!(!se_ressemblent("Siaka", "Thanh"));
        assert!(!se_ressemblent("difficulté", "Thanh"));
        // Une consonne de plus sur un nom court, c'est un autre élève.
        assert!(!se_ressemblent("Tan", "Tanguy"));
        assert!(!se_ressemblent("Kwan", "Kenzo"));
    }

    #[test]
    fn ne_reecoute_que_si_un_mot_ressemble_a_un_eleve() {
        let noms = classe();
        let proches = |texte: &str| prenoms_proches(texte, &noms);
        assert_eq!(proches("Pas la peine d'essayer avec Tan l'atelier."), ["Thanh"]);
        assert_eq!(proches("Avec Matisse et Louane, puis Tan."), ["Thanh", "Lou-Anne", "Mathis"]);
        // Un mot d'un nom composé suffit à le montrer en entier.
        assert_eq!(proches("Avec Lou."), ["Lou-Anne"]);
        // Le prénom est déjà juste, ou rien ne lui ressemble : une écoute suffit.
        assert!(proches("Thanh réussit le jeu des ombres.").is_empty());
        assert!(proches("La séance s'est bien passée, on reprendra jeudi.").is_empty());
        // Un mot de tous les jours en tête de phrase n'est pas un prénom.
        assert!(proches("Tant pis pour aujourd'hui.").is_empty());
        assert!(proches("").is_empty());
        assert!(prenoms_proches("Avec Tan.", &[]).is_empty());
    }

    #[test]
    fn prend_les_prenoms_de_la_seconde_ecoute_et_rien_d_autre() {
        let noms = classe();
        let entendu = "difficulté pour Tan à reconnaître les couleurs. Tan réussit le jeu des ombres.";
        let guide = "C'est difficile pour Thanh à reconnaître les couleurs. Thanh réussit le jeu des ombres.";
        assert_eq!(
            corriger_les_noms(entendu, guide, &noms),
            "difficulté pour Thanh à reconnaître les couleurs. Thanh réussit le jeu des ombres."
        );
    }

    #[test]
    fn garde_la_premiere_ecoute_quand_la_seconde_divague() {
        let noms = classe();
        let entendu = "difficulté pour Tan à reconnaître les couleurs.";
        // Guidée, la seconde écoute a réécrit la phrase : rien n'y est un élève à la place d'un mot douteux.
        let guide = "Qu'est-ce qui vous a fait du mal pour qu'elle reconnaisse les couleurs ?";
        assert_eq!(corriger_les_noms(entendu, guide, &noms), entendu);
        // Un prénom de la seconde à la place d'un mot qui ne lui ressemble pas : on n'y touche pas.
        let guide = "Thanh pour Thanh à reconnaître les couleurs.";
        assert_eq!(corriger_les_noms("Difficulté pour Siaka à reconnaître les couleurs.", guide, &noms),
            "Difficulté pour Siaka à reconnaître les couleurs.");
    }

    #[test]
    fn un_mot_de_tous_les_jours_ne_devient_pas_un_prenom() {
        let noms = classe();
        // « Tant » se dit comme « Thanh » ; guidé, le modèle a pu l'écrire ainsi.
        assert_eq!(corriger_les_noms("Tant pis, tant mieux.", "Thanh pis, tant mieux.", &noms), "Tant pis, tant mieux.");
        // Sans majuscule, ce n'était pas un prénom pour la première écoute.
        assert_eq!(corriger_les_noms("il est tant venu", "il est Thanh venu", &noms), "il est tant venu");
    }

    #[test]
    fn garde_la_ponctuation_et_ecrit_le_prenom_comme_la_liste() {
        let noms = classe();
        assert_eq!(corriger_les_noms("Avec Tan, puis (Matisse).", "Avec THANH, puis (Mathis).", &noms), "Avec Thanh, puis (Mathis).");
        assert_eq!(corriger_les_noms("Avec Lou Ann.", "Avec Lou-Anne.", &noms), "Avec Lou Ann.");
        assert_eq!(corriger_les_noms("Avec Louane.", "Avec Lou-Anne.", &noms), "Avec Lou-Anne.");
    }

    #[test]
    fn decoupe_un_mot_de_sa_ponctuation() {
        assert_eq!(decouper("(Tan),"), ("(", "Tan", "),"));
        assert_eq!(decouper("Inès."), ("", "Inès", "."));
        assert_eq!(decouper("…"), ("…", "", ""));
    }
}
