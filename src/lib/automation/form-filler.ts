// ============================================
// UNIVERSAL FORM FILLER ENGINE
// Detects, maps, and fills ANY form on ANY website
// ============================================

import { Page } from 'puppeteer';
import { UserProfile, FIELD_PATTERNS, DEFAULT_PROFILE } from './user-profile';
import { browserManager } from './browser';

export interface FormField {
    selector: string;
    type: 'text' | 'email' | 'tel' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file' | 'date' | 'number' | 'password' | 'hidden';
    name: string;
    id: string;
    label: string;
    placeholder: string;
    required: boolean;
    options?: string[]; // For select/radio
    value?: string; // Current value
}

export interface FieldMapping {
    selector: string;
    profileField: keyof UserProfile | null;
    value: string;
    confidence: number;
}

// Detect all form fields on a page
export async function detectFormFields(page: Page): Promise<FormField[]> {
    browserManager.log('Scanning page for form fields...');

    const fields = await page.evaluate(() => {
        const results: any[] = [];

        // Find all input, select, textarea elements
        const inputs = document.querySelectorAll('input, select, textarea');

        inputs.forEach((el, index) => {
            const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

            // Skip hidden and submit types
            if (input.type === 'hidden' || input.type === 'submit' || input.type === 'button') {
                return;
            }

            // Find associated label
            let label = '';
            const labelEl = document.querySelector(`label[for="${input.id}"]`);
            if (labelEl) {
                label = labelEl.textContent?.trim() || '';
            } else {
                // Check parent for label
                const parent = input.closest('label, .form-group, .field, .input-group');
                if (parent) {
                    const labelText = parent.querySelector('label, .label, span')?.textContent;
                    label = labelText?.trim() || '';
                }
            }

            // Get options for select elements
            let options: string[] | undefined;
            if (input.tagName === 'SELECT') {
                const selectEl = input as HTMLSelectElement;
                options = Array.from(selectEl.options).map(opt => opt.text);
            }

            // Create unique selector
            let selector = '';
            if (input.id) {
                selector = `#${input.id}`;
            } else if (input.name) {
                selector = `[name="${input.name}"]`;
            } else {
                selector = `input:nth-of-type(${index + 1})`;
            }

            results.push({
                selector,
                type: input.type || (input.tagName === 'SELECT' ? 'select' : 'textarea'),
                name: input.name || '',
                id: input.id || '',
                label,
                placeholder: (input as HTMLInputElement).placeholder || '',
                required: input.required,
                options,
                value: input.value || '',
            });
        });

        return results;
    });

    browserManager.log(`Found ${fields.length} form fields`);
    return fields;
}

// Map detected fields to user profile data using pattern matching
export function mapFieldsToProfile(fields: FormField[], profile: UserProfile): FieldMapping[] {
    browserManager.log('Mapping form fields to user profile...');

    const mappings: FieldMapping[] = [];

    for (const field of fields) {
        // Combine all text we can use to identify the field
        const fieldText = `${field.label} ${field.name} ${field.placeholder} ${field.id}`.toLowerCase();

        let bestMatch: { profileField: keyof UserProfile | null; value: string; confidence: number } = {
            profileField: null,
            value: '',
            confidence: 0,
        };

        // Check each profile field pattern
        for (const [profileField, patterns] of Object.entries(FIELD_PATTERNS)) {
            for (const pattern of patterns) {
                if (fieldText.includes(pattern.toLowerCase())) {
                    const confidence = pattern.length / fieldText.length; // Longer match = higher confidence

                    if (confidence > bestMatch.confidence) {
                        const value = getProfileValue(profile, profileField as keyof UserProfile);
                        bestMatch = {
                            profileField: profileField as keyof UserProfile,
                            value: value?.toString() || '',
                            confidence,
                        };
                    }
                }
            }
        }

        mappings.push({
            selector: field.selector,
            ...bestMatch,
        });
    }

    const mappedCount = mappings.filter(m => m.profileField !== null).length;
    browserManager.log(`Mapped ${mappedCount}/${fields.length} fields to profile data`);

    return mappings;
}

// Get value from profile for a given field
function getProfileValue(profile: UserProfile, field: keyof UserProfile): string | number | undefined {
    const value = profile[field];

    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value === 'object') {
        // Handle arrays and objects
        if (Array.isArray(value)) {
            return value.join(', ');
        }
        return JSON.stringify(value);
    }

    return value;
}

// Fill the form with mapped values
export async function fillForm(page: Page, mappings: FieldMapping[]): Promise<number> {
    browserManager.log('Filling form fields...');

    let filledCount = 0;

    for (const mapping of mappings) {
        if (!mapping.value || mapping.profileField === null) {
            continue;
        }

        try {
            // Check if element exists
            const element = await page.$(mapping.selector);
            if (!element) {
                browserManager.log(`Field not found: ${mapping.selector}`);
                continue;
            }

            // Get element type
            const tagName = await element.evaluate(el => el.tagName.toLowerCase());
            const inputType = await element.evaluate(el => (el as HTMLInputElement).type?.toLowerCase() || '');

            if (tagName === 'select') {
                // Handle select
                await page.select(mapping.selector, mapping.value);
            } else if (inputType === 'checkbox' || inputType === 'radio') {
                // Handle checkbox/radio
                const shouldCheck = ['true', 'yes', '1'].includes(mapping.value.toLowerCase());
                if (shouldCheck) {
                    await element.click();
                }
            } else if (inputType === 'file') {
                // Handle file upload
                const input = element as unknown as HTMLInputElement;
                if (mapping.value) {
                    await (input as any).uploadFile(mapping.value);
                }
            } else {
                // Handle text input
                await element.click({ clickCount: 3 }); // Select all
                await page.keyboard.press('Backspace'); // Clear
                await element.type(mapping.value, { delay: 30 }); // Type with delay
            }

            filledCount++;
            browserManager.log(`✓ Filled ${mapping.profileField}: ${mapping.value.substring(0, 30)}...`);

        } catch (error) {
            browserManager.log(`Failed to fill ${mapping.selector}: ${error}`);
        }
    }

    browserManager.log(`Filled ${filledCount} fields`);
    return filledCount;
}

// Main function: Navigate to URL and fill the form
export async function fillFormAtUrl(url: string, profile: UserProfile = DEFAULT_PROFILE): Promise<{
    success: boolean;
    fieldsFound: number;
    fieldsFilled: number;
    error?: string;
}> {
    try {
        await browserManager.initialize();
        const page = browserManager.getPage();

        browserManager.setStep('Navigating to page', 1, 5);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        browserManager.log(`Loaded: ${url}`);

        browserManager.setStep('Detecting form fields', 2, 5);
        const fields = await detectFormFields(page);

        browserManager.setStep('Mapping fields to profile', 3, 5);
        const mappings = mapFieldsToProfile(fields, profile);

        browserManager.setStep('Filling form', 4, 5);
        const filledCount = await fillForm(page, mappings);

        browserManager.setStep('Complete', 5, 5);
        browserManager.setStatus('completed');
        browserManager.log(`✅ Form filling complete. Filled ${filledCount}/${fields.length} fields.`);

        return {
            success: true,
            fieldsFound: fields.length,
            fieldsFilled: filledCount,
        };

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        browserManager.setError(errorMsg);
        return {
            success: false,
            fieldsFound: 0,
            fieldsFilled: 0,
            error: errorMsg,
        };
    }
}

export { DEFAULT_PROFILE };
