import { describe, expect, it } from "vitest";
import { parseSubscriberCsv, subscriberEmailsToCsv } from "./csv";

describe("CSV abonnés", () => {
	it("normalise, déduplique et ignore les adresses invalides", () => expect(parseSubscriberCsv("email\nADA@example.com\nada@example.com\ninvalide")).toEqual(["ada@example.com"]));
	it("exporte un fichier avec en-tête", () => expect(subscriberEmailsToCsv(["ada@example.com"])).toBe('email\r\n"ada@example.com"'));
});
