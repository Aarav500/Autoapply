/**
 * DELETE /api/profile/education/[id] - Remove education entry
 */

import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate } from '@/lib/api-utils';
import { removeEducation } from '@/services/profile/profile-service';
import { AuthError, NotFoundError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { userId } = await authenticate(request);
        const { id: educationId } = await params;

        const profile = await removeEducation(userId, educationId);

        logger.info({ userId, educationId }, 'Education removed via API');
        return apiResponse({ profile });
    } catch (error) {
        if (error instanceof AuthError) {
            return apiError(error, 401);
        }
        if (error instanceof NotFoundError) {
            return apiError(error, 404);
        }
        logger.error({ error }, 'Remove education endpoint error');
        return apiError(new Error('Internal server error'), 500);
    }
}
