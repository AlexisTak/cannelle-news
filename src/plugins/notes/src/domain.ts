export interface Note {
	id: string;
	title: string;
	body: string;
	authorId: string;
	authorName: string;
	assigneeId: string | null;
	assigneeName: string | null;
	status: "todo" | "done";
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
}

export function sortNotes(notes: Note[]): Note[] {
	return [...notes].sort((a, b) => {
		if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
		return b.updatedAt.localeCompare(a.updatedAt);
	});
}

export function filterByStatus(notes: Note[], status: "todo" | "done"): Note[] {
	return notes.filter((note) => note.status === status);
}
