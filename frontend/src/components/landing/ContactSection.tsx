import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  message: z.string().trim().min(1, "Message is required").max(1000, "Message must be less than 1000 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

const fieldVariant = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
};

export function ContactSection() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (_data: ContactForm) => {
    toast.success("Message sent! We'll get back to you soon.");
    reset();
  };

  return (
    <section id="contact" className="py-32 relative scroll-mt-20">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="lg:sticky lg:top-28 lg:self-start"
          >
            <h2 className="text-fluid-heading font-display font-bold text-foreground">
              Get in touch
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
              Question about integrating, pricing, or going live? Send a note and a real person
              gets back to you, usually within a day.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Typical reply in under 24 hours
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Self-custody, your funds stay yours
              </li>
              <li className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-success" /> Live in minutes with the embed widget
              </li>
            </ul>
          </motion.div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 rounded-xl border border-border bg-card p-6 md:p-8"
          >
          <motion.div custom={0} variants={fieldVariant} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </motion.div>

          <motion.div custom={1} variants={fieldVariant} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </motion.div>

          <motion.div custom={2} variants={fieldVariant} initial="hidden" whileInView="show" viewport={{ once: true }} className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="How can we help?" rows={5} {...register("message")} />
            {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
          </motion.div>

          <motion.div custom={3} variants={fieldVariant} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              Send message
            </Button>
          </motion.div>
        </form>
        </div>
      </div>
    </section>
  );
}
