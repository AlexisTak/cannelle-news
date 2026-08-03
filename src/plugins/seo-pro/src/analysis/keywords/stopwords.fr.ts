/**
 * Mots vides français.
 *
 * Sert deux usages : filtrer les candidats mots-clés (`extract.ts`) et peser la
 * détection de langue (`../readability/detect-language.ts`). Les accents sont
 * conservés — `detectLanguage` compare du texte brut, et « à », « où », « même »
 * sont justement des marqueurs forts du français.
 */
export const stopwordsFr = new Set([
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
]);
