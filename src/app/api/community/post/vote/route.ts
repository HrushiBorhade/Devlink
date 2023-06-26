import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { PostVoteValidator } from "@/lib/validators/vote";

export async function PATCH(req: Request) {
  const body = await req.json();
  const { postId, voteType } = PostVoteValidator.parse(body);

  const session = await getAuthSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const existingVote = await db.vote.findFirst({
    where: {
      userId: session.user.id,
      postId,
    },
  });

  const post = await db.post.findUnique({
    where: { id: postId },
    include: {
      author: true,
      votes: true,
    },
  });
  if (!post) {
    return new Response("Post not found", { status: 404 });
  }

  if (existingVote) {
    if (existingVote.type === voteType) {
      await db.vote.delete({
        where: {
          userId_postId: {
            userId: session.user.id,
            postId,
          },
        },
      });

      //recounting the votes

      const votesAmt = post.votes.reduce((acc, vote) => {
        if (vote.type === "UP") return acc + 1;
        if (vote.type === "DOWN") return acc - 1;
        return acc;
      }, 0);
      return new Response("OK");
    }
    //if vote is different from existingVote
    await db.vote.update({
      where: {
        userId_postId: {
          postId,
          userId: session.user.id,
        },
      },
      data: {
        type: voteType,
      },
    });
    // Recount the votes
    const votesAmt = post.votes.reduce((acc, vote) => {
      if (vote.type === "UP") return acc + 1;
      if (vote.type === "DOWN") return acc - 1;
      return acc;
    }, 0);
  }
}