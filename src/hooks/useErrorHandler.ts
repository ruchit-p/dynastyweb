"use client";

// MARK: useErrorHandler

import { useToast } from "@/hooks/use-toast";

interface Options {
  title?: string;
  defaultMessage?: string;
}

export function useErrorHandler(options: Options = {}) {
  const { toast } = useToast();
  const { title = "Error", defaultMessage = "Something went wrong" } = options;

  function withErrorHandling<F extends (...args: any[]) => Promise<any>>(
    fn: F
  ): (...args: Parameters<F>) => Promise<ReturnType<F> | void> {
    return async (...args: Parameters<F>) => {
      try {
        return await fn(...args);
      } catch (err) {
        console.error(err);
        const description = err instanceof Error ? err.message : defaultMessage;
        toast({ title, description, variant: "destructive" });
      }
    };
  }

  return { withErrorHandling } as const;
} 