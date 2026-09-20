/**
 * Seeds a demo "Quiz Night Demo" game for local development (spec section
 * 72). Creates/reuses a host account, three categories covering every
 * media type (image, GIF, YouTube, uploaded audio, multiple media items),
 * a Final Question, and prints the game's URL.
 *
 * Usage:
 *   npm run seed
 *   SEED_HOST_EMAIL=me@example.com SEED_HOST_PASSWORD=... npm run seed
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (loaded
 * from .env.local via `node --env-file`).
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const HOST_EMAIL = process.env.SEED_HOST_EMAIL ?? "demo@quiznight.local";
const HOST_PASSWORD = process.env.SEED_HOST_PASSWORD ?? "QuizNightDemo123!";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in first.");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

/** A tiny synthesized WAV beep (no external asset, no licensing concerns). */
function buildBeepWav(): Buffer {
  const sampleRate = 8000;
  const seconds = 1.2;
  const numSamples = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const freq = 440 + 220 * Math.sin(2 * Math.PI * 0.5 * t);
    const sample = Math.sin(2 * Math.PI * freq * t) * (1 - t / seconds);
    data[i] = Math.round((sample * 0.5 + 0.5) * 255);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate, 28);
  header.writeUInt16LE(1, 32);
  header.writeUInt16LE(8, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

async function ensureHostUser(): Promise<string> {
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === HOST_EMAIL);
  if (existing) {
    console.log(`Using existing host account: ${HOST_EMAIL}`);
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: HOST_EMAIL,
    password: HOST_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  console.log(`Created host account: ${HOST_EMAIL} / ${HOST_PASSWORD}`);
  return data.user.id;
}

async function main() {
  const ownerId = await ensureHostUser();

  const { data: existingGame } = await admin.from("games").select("id").eq("owner_id", ownerId).eq("title", "Quiz Night Demo").maybeSingle();
  if (existingGame) {
    console.log("Demo game already exists, skipping creation:", existingGame.id);
    console.log(`Open it at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/games/${existingGame.id}/edit`);
    return;
  }

  const { data: game, error: gameError } = await admin
    .from("games")
    .insert({
      owner_id: ownerId,
      title: "Quiz Night Demo",
      description: "A sample quiz demonstrating every media type and Final Question.",
      game_type: "classic",
      settings: {
        defaultCountdownSeconds: 15,
        soundEffectsEnabled: true,
        incorrectPenalty: "full",
        mediaAutoplay: true,
      },
    })
    .select()
    .single();
  if (gameError) throw gameError;
  console.log("Created game:", game.id);

  const categories = [
    { name: "General Knowledge", position: 0 },
    { name: "Movies & Shows", position: 1 },
    { name: "Sound & Vision", position: 2 },
  ];

  const categoryIds: Record<string, string> = {};
  for (const cat of categories) {
    const { data, error } = await admin.from("categories").insert({ game_id: game.id, ...cat }).select().single();
    if (error) throw error;
    categoryIds[cat.name] = data.id;
  }

  async function addQuestion(
    categoryName: string,
    points: number,
    questionText: string,
    answerText: string,
    opts: { notes?: string; mediaPlacement?: "before_question" | "after_question" | "instead_of_question" } = {}
  ) {
    const { data, error } = await admin
      .from("questions")
      .insert({
        category_id: categoryIds[categoryName],
        points,
        question_text: questionText,
        answer_text: answerText,
        notes: opts.notes ?? null,
        media_placement: opts.mediaPlacement ?? "after_question",
        position: points,
      })
      .select()
      .single();
    if (error) throw error;
    return data.id as string;
  }

  async function addMedia(questionId: string, media: Record<string, unknown>) {
    const { error } = await admin.from("media").insert({ question_id: questionId, position: 0, ...media });
    if (error) throw error;
  }

  // General Knowledge -- plain text questions.
  await addQuestion("General Knowledge", 100, "What is the capital of France?", "Paris");
  await addQuestion("General Knowledge", 200, "How many continents are there on Earth?", "Seven");
  await addQuestion("General Knowledge", 300, "What planet is known as the Red Planet?", "Mars");
  await addQuestion("General Knowledge", 400, "What is the largest ocean on Earth?", "The Pacific Ocean");
  await addQuestion("General Knowledge", 500, "In what year did the first humans land on the Moon?", "1969");

  // Movies & Shows -- YouTube + image media.
  await addQuestion("Movies & Shows", 100, "Name any one of the Chronicles of Narnia books.", "Accept any (e.g. The Lion, the Witch and the Wardrobe)");
  const ytQ = await addQuestion("Movies & Shows", 200, "What's happening in this clip?", "A classic open-source animated short (Big Buck Bunny)");
  await addMedia(ytQ, { type: "youtube", url: "https://www.youtube.com/watch?v=YE7VzlLtp-4", youtube_id: "YE7VzlLtp-4" });
  await addQuestion("Movies & Shows", 300, "What do you call a movie made entirely of computer animation?", "A CGI / animated film");
  const imgQ = await addQuestion("Movies & Shows", 400, "What classic shape is shown in this image?", "A clapperboard / film slate", {
    mediaPlacement: "before_question",
  });
  await addMedia(imgQ, { type: "image", url: "https://picsum.photos/seed/quiznight-clapper/800/500" });
  const multiQ = await addQuestion("Movies & Shows", 500, "Two clues, one answer: what do these images have in common?", "They're both classic cinema icons", {
    notes: "Accept any reasonable film-related answer.",
  });
  await addMedia(multiQ, { type: "image", url: "https://picsum.photos/seed/quiznight-a/600/400" });
  await addMedia(multiQ, { type: "image", url: "https://picsum.photos/seed/quiznight-b/600/400" });

  // Sound & Vision -- uploaded audio + GIF + multi-media.
  await addQuestion("Sound & Vision", 100, "What's the name for a series of musical notes played in sequence?", "A melody");
  await addQuestion("Sound & Vision", 200, "What instrument has 88 keys?", "The piano");
  const audioQ = await addQuestion("Sound & Vision", 300, "What kind of sound is this?", "A synthesized test tone (demo audio upload)");
  const wavBuffer = buildBeepWav();
  const audioPath = `${ownerId}/seed/demo-tone.wav`;
  const { error: audioUploadError } = await admin.storage.from("quiz-media").upload(audioPath, wavBuffer, {
    contentType: "audio/wav",
    upsert: true,
  });
  if (audioUploadError) console.warn("Could not upload demo audio (bucket may not exist yet -- run the migration first):", audioUploadError.message);
  else {
    const { data: pub } = admin.storage.from("quiz-media").getPublicUrl(audioPath);
    await addMedia(audioQ, { type: "audio", url: pub.publicUrl, storage_path: audioPath, duration: 1.2 });
  }
  await addQuestion("Sound & Vision", 400, "What do we call a short, looping animated image with no sound?", "A GIF", { mediaPlacement: "instead_of_question" });
  await addQuestion("Sound & Vision", 500, "True or false: vinyl records are analog, not digital.", "True");

  // Final Question.
  const { data: finalCat, error: finalCatError } = await admin
    .from("categories")
    .insert({ game_id: game.id, name: "Grand Finale", position: 3 })
    .select()
    .single();
  if (finalCatError) throw finalCatError;
  await admin.from("questions").insert({
    category_id: finalCat.id,
    points: 1000,
    question_text: "This 1969 event was watched live by an estimated 600 million people worldwide.",
    answer_text: "The Apollo 11 Moon landing",
    is_final: true,
    position: 0,
  });

  console.log("\nDemo game ready!");
  console.log(`Host login: ${HOST_EMAIL} / ${HOST_PASSWORD}`);
  console.log(`Edit it at ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/games/${game.id}/edit`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
