import { z } from "zod";

const s = z.string("must be text").trim().min(2, "too short").max(60, "too long").toLowerCase();
console.log("ctor string", JSON.stringify(z.string("must be text").safeParse(1)));
console.log("trim", JSON.stringify(s.safeParse(" Ab ")));
console.log("short", JSON.stringify(s.safeParse("a")));
console.log("obj error map", JSON.stringify(z.string({ error: "must be text" }).safeParse({ a: 1 })));

const schema = z
  .object({
    fullName: z
      .string("Full name must be text.")
      .trim()
      .min(2, "Full name must be at least 2 characters.")
      .max(60, "Full name must be at most 60 characters."),
    bio: z.string("Bio must be text.").trim().max(300, "Bio must be at most 300 characters."),
    nativeLanguage: z.string("Native language must be text.").trim(),
    learningLanguage: z.string("Learning language must be text.").trim(),
    profilePic: z
      .string("Profile picture must be text.")
      .trim()
      .max(300, "Profile picture must be at most 300 characters.")
      .optional(),
  })
  .refine((d) => d.nativeLanguage !== d.learningLanguage, {
    message: "Choose a different language to learn.",
    path: ["learningLanguage"],
  });

const extra = schema.safeParse({
  fullName: "Ann",
  bio: "hi",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  friends: ["x"],
  $set: { a: 1 },
});
console.log("extra", extra.success, extra.success && extra.data);

const same = schema.safeParse({
  fullName: "Ann",
  bio: "hi",
  nativeLanguage: "english",
  learningLanguage: "english",
});
console.log(
  "same",
  same.success ? same.data : same.error.issues.map((i) => [i.path, i.message]),
);

const badType = schema.safeParse({
  fullName: { $gt: "" },
  bio: "hi",
  nativeLanguage: "english",
  learningLanguage: "spanish",
});
console.log(
  "bad type",
  badType.success ? badType.data : badType.error.issues.map((i) => [i.path, i.message]),
);

const both = schema.safeParse({
  fullName: "A",
  bio: 1,
  nativeLanguage: "nope",
  learningLanguage: "english",
});
console.log(
  "both",
  both.error.issues.map((i) => [i.path.join("."), i.message]),
);

const emptyPic = schema.safeParse({
  fullName: "Ann",
  bio: "hi",
  nativeLanguage: "english",
  learningLanguage: "spanish",
  profilePic: "",
});
console.log("empty pic", emptyPic.success, emptyPic.success ? emptyPic.data : emptyPic.error.issues);

const missingPic = schema.safeParse({
  fullName: "Ann",
  bio: "hi",
  nativeLanguage: "english",
  learningLanguage: "spanish",
});
console.log("missing pic", missingPic.success, missingPic.success && missingPic.data);

const HOSTS = new Set(["api.dicebear.com", "avatar.iran.liara.run"]);
function allowedAvatar(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return url.protocol === "https:" && HOSTS.has(url.hostname);
}
for (const sample of [
  "https://api.dicebear.com/9.x/lorelei/svg?seed=abc",
  "https://avatar.iran.liara.run/public/1.png",
  "http://api.dicebear.com/9.x/lorelei/svg?seed=abc",
  "https://evil.com/api.dicebear.com",
  "https://api.dicebear.com.evil.com/x",
  "not a url",
  "https://user:pass@api.dicebear.com/x",
]) {
  console.log(allowedAvatar(sample), sample);
}

const long = z.string().min(6, "Password must be at least 6 characters").max(72, "Password must be at most 72 characters");
console.log("pw73", long.safeParse("a".repeat(73)).error.issues.map((i) => [i.code, i.message]));
console.log("pw5", long.safeParse("abcde").error.issues.map((i) => [i.code, i.message]));

const listed = z
  .string("Native language must be text.")
  .trim()
  .refine((value) => ["english"].includes(value), "Choose a native language from the list.");
console.log("lang", listed.safeParse("English").error.issues.map((i) => i.message));
console.log("lang ok", listed.safeParse(" english ").data);
