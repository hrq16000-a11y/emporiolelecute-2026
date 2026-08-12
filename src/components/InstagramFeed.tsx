import { Instagram, Heart, ExternalLink } from "lucide-react";
import { useInstagramPosts } from "@/hooks/useInstagramPosts";
import { BlurImage } from "@/components/BlurImage";
import sabonetesImg from "@/assets/category-sabonetes.webp";
import velasImg from "@/assets/category-velas.webp";
import lembrancinhasImg from "@/assets/category-lembrancinhas.webp";
import kitsImg from "@/assets/category-kits.webp";

const fallbackPosts = [
  { id: "f1", image_url: sabonetesImg, alt_text: "Sabonetes artesanais", post_url: null },
  { id: "f2", image_url: velasImg, alt_text: "Velas perfumadas", post_url: null },
  { id: "f3", image_url: lembrancinhasImg, alt_text: "Lembrancinhas em caixinhas", post_url: null },
  { id: "f4", image_url: kitsImg, alt_text: "Kits maternidade", post_url: null },
  { id: "f5", image_url: sabonetesImg, alt_text: "Sabonetes florais", post_url: null },
  { id: "f6", image_url: velasImg, alt_text: "Velas aromáticas", post_url: null },
];

const InstagramFeed = () => {
  const { data: dbPosts } = useInstagramPosts();
  const posts = dbPosts && dbPosts.length > 0 ? dbPosts : fallbackPosts;

  return (
    <section className="py-20 bg-background" aria-labelledby="instagram-heading">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-light rounded-full text-primary text-sm font-medium mb-4">
            <Instagram className="h-4 w-4" />
            @emporiolelecute
          </span>
          <h2 id="instagram-heading" className="font-display text-4xl md:text-5xl text-foreground mb-4">
            Siga-nos no <span className="text-primary">Instagram</span>
          </h2>
          <p className="text-muted-foreground">Acompanhe novidades, bastidores e inspirações</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {posts.slice(0, 6).map((post) => (
            <a
              key={post.id}
              href={post.post_url || "https://www.instagram.com/emporiolelecute"}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={post.alt_text || "Postagem do Instagram"}
              className="relative aspect-square overflow-hidden rounded-xl group bg-muted/30 block"
            >
              <BlurImage
                src={post.image_url}
                alt={post.alt_text}
                width={600}
                responsiveWidths={[300, 450, 600, 900]}
                sizes="(max-width: 768px) 50vw, 33vw"
                wrapperClassName="absolute inset-0 w-full h-full"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                <Heart className="h-8 w-8 text-primary-foreground" />
              </div>
            </a>
          ))}
        </div>


        <div className="text-center mt-8">
          <a
            href="https://www.instagram.com/emporiolelecute"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white px-8 py-4 rounded-full font-semibold shadow-medium hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
          >
            <Instagram className="h-5 w-5" />
            Seguir no Instagram
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default InstagramFeed;
