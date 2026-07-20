import type { FormField, JobDetails, PortalId } from '@/lib/types';

/**
 * Common interface every portal adapter implements. Methods are async because
 * form interaction involves waiting for DOM updates, navigation, and
 * human-paced delays.
 */
export interface JobPortalAdapter {
  readonly id: PortalId;
  readonly name: string;

  /** Does this adapter handle the given URL? */
  matchUrl(url: string): boolean;

  /** Read the job posting currently on screen. */
  extractJobDetails(): JobDetails;

  /** Is an application form / "apply" affordance present right now? */
  hasApplyForm(): boolean;

  /** Open the apply form (e.g. click "Easy Apply"). Resolves when it's ready. */
  openApplyForm(): Promise<boolean>;

  /** Enumerate the fields on the currently-visible form step. */
  detectFormFields(): FormField[];

  fillField(field: FormField, value: string): Promise<void>;
  uploadFile(field: FormField, file: File): Promise<void>;

  /** Advance a multi-step form. Returns true if a next step was shown. */
  handleNextStep(): Promise<boolean>;

  /** Click the final submit control. */
  submitApplication(): Promise<boolean>;

  /** True when the form reports successful submission. */
  isSubmitted(): boolean;
}
