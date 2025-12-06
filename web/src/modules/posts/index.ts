import { createPostsUseCases } from "./application/use-cases";
import { postRepositoryPrisma } from "./infrastructure/prisma/post.repository.prisma";
import { categoryRepositoryPrisma } from "./infrastructure/prisma/category.repository.prisma";
import { tagRepositoryPrisma } from "./infrastructure/prisma/tag.repository.prisma";
import { postVersionRepositoryPrisma } from "./infrastructure/prisma/post-version.repository.prisma";

export const postsUseCases = createPostsUseCases({
  posts: postRepositoryPrisma,
  versions: postVersionRepositoryPrisma,
  categories: categoryRepositoryPrisma,
  tags: tagRepositoryPrisma,
});
