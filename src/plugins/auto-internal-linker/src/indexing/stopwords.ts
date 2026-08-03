import { normalizeKeyword } from "../matching/normalize";

const RAW_FR = [
	"a", "à", "afin", "ai", "aie", "ainsi", "ait", "alors", "après", "as", "assez",
	"au", "aucun", "aucune", "aujourd'hui", "auquel", "aura", "aurait", "aussi",
	"autant", "autre", "autres", "aux", "avaient", "avais", "avait", "avant",
	"avec", "avoir", "avons", "ayant",
	"beaucoup", "bien",
	"c", "ça", "car", "ce", "ceci", "cela", "celle", "celles", "celui", "cependant",
	"certain", "certaine", "certaines", "certains", "ces", "cet", "cette", "ceux",
	"chaque", "chez", "combien", "comme", "comment", "contre",
	"d", "dans", "de", "dedans", "dehors", "déjà", "depuis", "des", "dès",
	"desquels", "dessous", "dessus", "deux", "devant", "devrait", "doit", "donc",
	"dont", "du", "duquel", "durant",
	"elle", "elles", "en", "encore", "entre", "envers", "es", "est", "et", "étaient",
	"étais", "était", "étant", "été", "être", "eu", "eux",
	"faire", "fait", "faites", "fois", "font",
	"hors",
	"ici", "il", "ils",
	"j", "je", "jusqu", "jusque",
	"l", "la", "laquelle", "le", "lequel", "les", "lesquelles", "lesquels", "leur",
	"leurs", "lors", "lorsque", "lui",
	"m", "ma", "mais", "malgré", "me", "même", "mêmes", "mes", "mien", "moi",
	"moins", "mon",
	"n", "ne", "ni", "non", "nos", "notre", "nous",
	"on", "ont", "ou", "où", "oui",
	"par", "parce", "parmi", "pas", "pendant", "peu", "peut", "peuvent", "plus",
	"plusieurs", "posséder", "pour", "pourquoi", "près", "puis", "puisque",
	"qu", "quand", "que", "quel", "quelle", "quelles", "quels", "qui", "quoi",
	"s", "sa", "sans", "se", "selon", "sera", "serait", "ses", "seulement", "si",
	"sien", "soi", "soit", "sommes", "son", "sont", "sous", "souvent", "suis",
	"sur",
	"t", "ta", "tandis", "tant", "te", "tel", "telle", "tes", "toi", "ton",
	"toujours", "tous", "tout", "toute", "toutes", "très", "trop", "tu",
	"un", "une",
	"va", "vers", "voici", "voilà", "vont", "vos", "votre", "vous",
	"y",
];

const RAW_EN = [
	"a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
	"any", "are", "as", "at",
	"be", "because", "been", "before", "being", "below", "between", "both", "but",
	"by",
	"can", "cannot", "could",
	"did", "do", "does", "doing", "down", "during",
	"each", "few", "for", "from", "further",
	"had", "has", "have", "having", "he", "her", "here", "hers", "herself", "him",
	"himself", "his", "how",
	"i", "if", "in", "into", "is", "it", "its", "itself",
	"just",
	"me", "more", "most", "my", "myself",
	"no", "nor", "not", "now",
	"of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours",
	"ourselves", "out", "over", "own",
	"same", "she", "should", "so", "some", "such",
	"than", "that", "the", "their", "theirs", "them", "themselves", "then",
	"there", "these", "they", "this", "those", "through", "to", "too",
	"under", "until", "up",
	"very",
	"was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
	"why", "will", "with", "would",
	"you", "your", "yours", "yourself", "yourselves",
];

/**
 * Mots vides des deux langues, sous leur forme **normalisée**.
 *
 * La normalisation au chargement n'est pas cosmétique : la comparaison porte
 * sur des jetons désaccentués, donc une liste gardant « déjà » et « où » ne
 * filtrerait jamais « deja » ni « ou ». Les deux langues sont fusionnées parce
 * qu'un article français cite constamment des termes anglais.
 */
export const STOPWORDS: ReadonlySet<string> = new Set(
	[...RAW_FR, ...RAW_EN].map(normalizeKeyword),
);
