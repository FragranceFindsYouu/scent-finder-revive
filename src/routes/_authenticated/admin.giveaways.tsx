import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Shuffle, Trash2, Trophy, UserPlus } from "lucide-react";
import {
  listGiveaways,
  listEntries,
  createGiveaway,
  deleteGiveaway,
  addEntry,
  removeEntry,
  pickWinner,
  reopenGiveaway,
  type Giveaway,
  type GiveawayEntry,
} from "@/lib/giveaways.functions";

export const Route = createFileRoute("/_authenticated/admin/giveaways")({
  head: () => ({
    meta: [
      { title: "Giveaways — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GiveawaysAdmin,
});

function GiveawaysAdmin() {
  const qc = useQueryClient();
  const listFn = useServerFn(listGiveaways);
  const createFn = useServerFn(createGiveaway);
  const deleteFn = useServerFn(deleteGiveaway);
  const reopenFn = useServerFn(reopenGiveaway);

  const { data: giveaways = [], isLoading } = useQuery({
    queryKey: ["giveaways"],
    queryFn: () => listFn(),
  });

  const [title, setTitle] = useState("");
  const [prize, setPrize] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (input: { title: string; prize: string; description: string }) =>
      createFn({ data: input }),
    onSuccess: (g) => {
      toast.success("Giveaway created");
      setTitle("");
      setPrize("");
      setDescription("");
      setSelectedId(g.id);
      qc.invalidateQueries({ queryKey: ["giveaways"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["giveaways"] });
    },
  });

  const reopenMut = useMutation({
    mutationFn: (id: string) => reopenFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Reopened");
      qc.invalidateQueries({ queryKey: ["giveaways"] });
    },
  });

  const selected = giveaways.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-foreground">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Giveaways</h1>
          <p className="text-sm text-muted-foreground">Run a giveaway, add participants, and pick a winner manually or at random.</p>
        </div>
        <Link to="/admin-dashboard" className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
          ← Back to admin
        </Link>
      </div>

      <div className="mb-10 rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-serif text-xl">New giveaway</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Summer Sample Giveaway)"
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
            placeholder="Prize (e.g. 5ml decant of choice)"
            className="rounded border border-border bg-background px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description / rules (optional)"
            rows={2}
            className="rounded border border-border bg-background px-3 py-2 text-sm md:col-span-2"
          />
        </div>
        <button
          disabled={!title.trim() || createMut.isPending}
          onClick={() => createMut.mutate({ title: title.trim(), prize, description })}
          className="mt-4 rounded-full bg-primary px-5 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
        >
          {createMut.isPending ? "Creating…" : "Create giveaway"}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">All giveaways</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : giveaways.length === 0 ? (
            <p className="text-sm text-muted-foreground">No giveaways yet.</p>
          ) : (
            <ul className="space-y-2">
              {giveaways.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => setSelectedId(g.id)}
                    className={`w-full rounded border p-3 text-left transition ${
                      selectedId === g.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{g.title}</span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.15em] ${
                          g.status === "open" ? "text-emerald-600" : "text-muted-foreground"
                        }`}
                      >
                        {g.status}
                      </span>
                    </div>
                    {g.prize && <div className="mt-1 text-xs text-muted-foreground">Prize: {g.prize}</div>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {selected ? (
            <GiveawayDetail
              giveaway={selected}
              onDelete={() => deleteMut.mutate(selected.id)}
              onReopen={() => reopenMut.mutate(selected.id)}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Select a giveaway to manage entries and pick a winner.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GiveawayDetail({
  giveaway,
  onDelete,
  onReopen,
}: {
  giveaway: Giveaway;
  onDelete: () => void;
  onReopen: () => void;
}) {
  const qc = useQueryClient();
  const listEntriesFn = useServerFn(listEntries);
  const addFn = useServerFn(addEntry);
  const removeFn = useServerFn(removeEntry);
  const pickFn = useServerFn(pickWinner);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["giveaway-entries", giveaway.id],
    queryFn: () => listEntriesFn({ data: { giveawayId: giveaway.id } }),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const addMut = useMutation({
    mutationFn: () => addFn({ data: { giveawayId: giveaway.id, name, email, note } }),
    onSuccess: () => {
      toast.success("Entry added");
      setName("");
      setEmail("");
      setNote("");
      qc.invalidateQueries({ queryKey: ["giveaway-entries", giveaway.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["giveaway-entries", giveaway.id] }),
  });

  const pickMut = useMutation({
    mutationFn: (entryId?: string) =>
      pickFn({ data: { giveawayId: giveaway.id, entryId } }),
    onSuccess: ({ winner }) => {
      toast.success(`Winner: ${winner.name}`);
      qc.invalidateQueries({ queryKey: ["giveaway-entries", giveaway.id] });
      qc.invalidateQueries({ queryKey: ["giveaways"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const winner = entries.find((e) => e.id === giveaway.winner_entry_id) ?? null;
  const closed = giveaway.status === "closed";

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">{giveaway.title}</h2>
            {giveaway.prize && <p className="mt-1 text-sm text-muted-foreground">Prize: {giveaway.prize}</p>}
            {giveaway.description && <p className="mt-2 text-sm">{giveaway.description}</p>}
          </div>
          <button
            onClick={onDelete}
            className="text-xs uppercase tracking-[0.15em] text-destructive hover:underline"
          >
            Delete
          </button>
        </div>

        {winner && (
          <div className="mt-4 flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 p-4">
            <Trophy size={20} className="text-primary" />
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-muted-foreground">Winner</div>
              <div className="font-medium">{winner.name}</div>
              <div className="text-sm text-muted-foreground">{winner.email}</div>
            </div>
            {closed && (
              <button
                onClick={onReopen}
                className="ml-auto rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.15em] hover:bg-muted"
              >
                Reopen
              </button>
            )}
          </div>
        )}
      </div>

      {!closed && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">Add participant</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" className="rounded border border-border bg-background px-3 py-2 text-sm" />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="rounded border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <button
            disabled={!name.trim() || !email.trim() || addMut.isPending}
            onClick={() => addMut.mutate()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
          >
            <UserPlus size={14} />
            Add entry
          </button>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Entries ({entries.length})
          </h3>
          {!closed && entries.length > 0 && (
            <button
              onClick={() => pickMut.mutate(undefined)}
              disabled={pickMut.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:opacity-50"
            >
              {pickMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Shuffle size={14} />}
              Pick random winner
            </button>
          )}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isWinner={entry.id === giveaway.winner_entry_id}
                canAct={!closed}
                onPick={() => pickMut.mutate(entry.id)}
                onRemove={() => removeMut.mutate(entry.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  entry,
  isWinner,
  canAct,
  onPick,
  onRemove,
}: {
  entry: GiveawayEntry;
  isWinner: boolean;
  canAct: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div>
        <div className="flex items-center gap-2 font-medium">
          {entry.name}
          {isWinner && <Trophy size={14} className="text-primary" />}
        </div>
        <div className="text-xs text-muted-foreground">{entry.email}</div>
        {entry.note && <div className="text-xs text-muted-foreground">{entry.note}</div>}
      </div>
      {canAct && (
        <div className="flex items-center gap-2">
          <button
            onClick={onPick}
            className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.15em] hover:bg-muted"
          >
            Pick as winner
          </button>
          <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </li>
  );
}
