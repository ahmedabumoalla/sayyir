import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { checkAdminPermission } from '@/lib/adminGuard';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type TextEntry = {
  keyPath: string;
  value: string;
};

type ProviderRequest = {
  id?: string;
  user_id?: string | null;
  email: string;
  name: string;
  phone?: string | null;
  service_type?: string | null;
  dynamic_data?: unknown;
  status?: string | null;
  approved_at?: string | null;
};

type JsonRecord = Record<string, unknown>;

type ServiceRecord = {
  id: string;
  title?: string | null;
  status?: string | null;
  provider_id?: string | null;
  details?: unknown;
  profiles?: { email?: string | null } | { email?: string | null }[] | null;
};

type ServiceResult =
  | { service: ServiceRecord; created: boolean; blocked?: false }
  | { blocked: true; code: 'service_archived_or_stopped_requires_manual_restore'; service: ServiceRecord };

const ARCHIVED_SERVICE_STATUSES = ['stopped', 'deleted', 'rejected'];

const ARABIC_CATEGORY_PATTERNS = {
  lodging: /\u0633\u0643\u0646|\u0646\u0632\u0644|\u0625\u0642\u0627\u0645\u0629|\u0627\u0642\u0627\u0645\u0629/,
  event: /\u0641\u0639\u0627\u0644\u064a\u0629/,
  experience: /\u062a\u062c\u0631\u0628\u0629/,
  facility: /\u0645\u0631\u0641\u0642/,
};

const TITLE_KEY_PATTERN =
  /(name|title|facility|lodging|place|venue|business|service|\u0627\u0633\u0645|\u0639\u0646\u0648\u0627\u0646|\u0645\u0631\u0641\u0642|\u0646\u0632\u0644|\u0645\u0646\u0634\u0623\u0629)/i;

const TITLE_VALUE_PATTERN =
  /\u0633\u0643\u0646|\u0646\u0632\u0644|\u0625\u0642\u0627\u0645\u0629|\u0627\u0642\u0627\u0645\u0629|\u0641\u0639\u0627\u0644\u064a\u0629|\u062a\u062c\u0631\u0628\u0629|\u0645\u0631\u0641\u0642/;

const DESCRIPTION_KEY_PATTERN =
  /(description|details|about|summary|bio|\u0648\u0635\u0641|\u062a\u0641\u0627\u0635\u064a\u0644|\u0646\u0628\u0630\u0629)/i;

const PRICE_KEY_PATTERN =
  /(price|cost|fee|\u0633\u0639\u0631|\u062a\u0643\u0644\u0641\u0629|\u0631\u0633\u0648\u0645)/i;

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function normalizeComparableText(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function isArchivedServiceStatus(status: unknown) {
  return ARCHIVED_SERVICE_STATUSES.includes(String(status || ''));
}

function getServiceProfileEmail(service: ServiceRecord) {
  if (Array.isArray(service.profiles)) return normalizeComparableText(service.profiles[0]?.email);
  return normalizeComparableText(service.profiles?.email);
}

function detailsContainEmail(details: unknown, email: string) {
  const normalizedEmail = normalizeComparableText(email);
  let found = false;

  if (!normalizedEmail) return false;

  walkDynamicData(details, (value) => {
    if (found || typeof value !== 'string') return;
    found = normalizeComparableText(value) === normalizedEmail;
  });

  return found;
}

function isUsableText(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.length >= 2 &&
    !isHttpUrl(trimmed) &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) &&
    !/^\+?\d[\d\s-]{6,}$/.test(trimmed)
  );
}

function walkDynamicData(
  value: unknown,
  visitor: (value: unknown, keyPath: string) => void,
  keyPath = ''
) {
  visitor(value, keyPath);

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkDynamicData(item, visitor, `${keyPath}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value as JsonRecord).forEach(([key, child]) => {
      walkDynamicData(child, visitor, keyPath ? `${keyPath}.${key}` : key);
    });
  }
}

function collectTextEntries(dynamicData: unknown): TextEntry[] {
  const entries: TextEntry[] = [];

  walkDynamicData(dynamicData, (value, keyPath) => {
    if (typeof value === 'string' && isUsableText(value)) {
      entries.push({ keyPath, value: value.trim() });
    }
  });

  return entries;
}

function findFirstHttpArray(dynamicData: unknown): string[] {
  let result: string[] = [];

  walkDynamicData(dynamicData, (value) => {
    if (result.length > 0 || !Array.isArray(value)) return;

    const urls = value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(isHttpUrl);

    if (urls.length > 0) result = urls;
  });

  return result;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function findFirstLocation(dynamicData: unknown): { lat: number | null; lng: number | null } {
  let location = { lat: null as number | null, lng: null as number | null };

  walkDynamicData(dynamicData, (value) => {
    if (location.lat !== null || !value || Array.isArray(value) || typeof value !== 'object') return;

    const item = value as JsonRecord;
    const rawLat = item.lat ?? item.latitude;
    const rawLng = item.lng ?? item.longitude;
    const latNumber = toFiniteNumber(rawLat);
    const lngNumber = toFiniteNumber(rawLng);

    if (latNumber !== null && lngNumber !== null) {
      location = { lat: latNumber, lng: lngNumber };
    }
  });

  return location;
}

function extractPrice(dynamicData: unknown) {
  let price: number | null = null;

  walkDynamicData(dynamicData, (value, keyPath) => {
    if (price !== null || !PRICE_KEY_PATTERN.test(keyPath)) return;

    const numericValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.replace(/[^\d.]/g, ''))
          : NaN;

    if (Number.isFinite(numericValue)) price = numericValue;
  });

  return price ?? 0;
}

function classifyService(dynamicData: unknown, requestServiceType: string | null | undefined) {
  const text = `${requestServiceType || ''} ${collectTextEntries(dynamicData)
    .map((entry) => entry.value)
    .join(' ')}`;

  if (ARABIC_CATEGORY_PATTERNS.lodging.test(text)) {
    return { service_category: 'lodging', sub_category: 'lodging' };
  }

  if (ARABIC_CATEGORY_PATTERNS.event.test(text)) {
    return { service_category: 'experience', sub_category: 'event' };
  }

  if (ARABIC_CATEGORY_PATTERNS.experience.test(text)) {
    return { service_category: 'experience', sub_category: 'experience' };
  }

  if (ARABIC_CATEGORY_PATTERNS.facility.test(text)) {
    return { service_category: 'facility', sub_category: 'facility' };
  }

  return { service_category: 'facility', sub_category: 'facility' };
}

function extractServiceData(requestData: ProviderRequest, requestId: string) {
  const dynamicData = requestData.dynamic_data || {};
  const textEntries = collectTextEntries(dynamicData);
  const images = findFirstHttpArray(dynamicData);
  const location = findFirstLocation(dynamicData);
  const category = classifyService(dynamicData, requestData.service_type);

  const shortTexts = textEntries.filter(({ value }) => value.length <= 80);
  const fallbackTitle = requestData.service_type || requestData.name || 'Service';
  const titleCandidate =
    shortTexts
      .map((entry) => ({
        ...entry,
        score:
          (TITLE_KEY_PATTERN.test(entry.keyPath) ? 3 : 0) +
          (TITLE_VALUE_PATTERN.test(entry.value) ? 3 : 0) +
          (entry.value.length >= 4 && entry.value.length <= 50 ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score || a.value.length - b.value.length)[0]?.value ||
    fallbackTitle;

  const descriptionCandidate =
    textEntries
      .filter((entry) => entry.value !== titleCandidate)
      .map((entry) => ({
        ...entry,
        score: (DESCRIPTION_KEY_PATTERN.test(entry.keyPath) ? 1000 : 0) + entry.value.length,
      }))
      .sort((a, b) => b.score - a.score)[0]?.value ||
    titleCandidate ||
    requestData.name;

  return {
    title: titleCandidate,
    description: descriptionCandidate,
    price: extractPrice(dynamicData),
    image_url: images[0] || null,
    location_lat: location.lat,
    location_lng: location.lng,
    service_category: category.service_category,
    sub_category: category.sub_category,
    service_type: category.service_category === 'experience' ? 'experience' : 'general',
    details: {
      ...(dynamicData && typeof dynamicData === 'object' && !Array.isArray(dynamicData)
        ? (dynamicData as JsonRecord)
        : {}),
      provider_request_id: requestId,
      images,
    },
  };
}

async function findAuthUserIdByEmail(email: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === normalizedEmail);
    if (user) return user.id;
    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

async function findExistingProviderIdsForRequest(requestData: ProviderRequest) {
  const providerIds = new Set<string>();

  if (requestData.user_id) {
    providerIds.add(requestData.user_id);
  }

  const { data: existingProfileByEmail, error: existingProfileError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', requestData.email)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (existingProfileByEmail?.id) {
    providerIds.add(existingProfileByEmail.id);
  }

  return Array.from(providerIds);
}

function isSameArchivedServiceCandidate(
  service: ServiceRecord,
  requestData: ProviderRequest,
  providerIds: string[],
  title: string
) {
  const sameTitle = normalizeComparableText(service.title) === normalizeComparableText(title);
  const sameProvider = Boolean(service.provider_id && providerIds.includes(service.provider_id));
  const sameEmail =
    getServiceProfileEmail(service) === normalizeComparableText(requestData.email) ||
    detailsContainEmail(service.details, requestData.email);

  return sameTitle && (sameProvider || sameEmail);
}

async function findArchivedServiceConflict(
  requestData: ProviderRequest,
  requestId: string,
  providerIds: string[]
) {
  const serviceData = extractServiceData(requestData, requestId);

  const { data: linkedServices, error: linkedServiceError } = await supabaseAdmin
    .from('services')
    .select('id, title, status, provider_id, details')
    .contains('details', { provider_request_id: requestId })
    .in('status', ARCHIVED_SERVICE_STATUSES)
    .limit(1);

  if (linkedServiceError) {
    throw new Error(linkedServiceError.message);
  }

  if (linkedServices?.[0]) {
    return linkedServices[0] as ServiceRecord;
  }

  const normalizedTitle = normalizeComparableText(serviceData.title);
  if (!normalizedTitle) return null;

  const { data: titleMatches, error: titleMatchError } = await supabaseAdmin
    .from('services')
    .select('id, title, status, provider_id, details, profiles(email)')
    .eq('title', serviceData.title)
    .in('status', ARCHIVED_SERVICE_STATUSES)
    .limit(50);

  if (titleMatchError) {
    throw new Error(titleMatchError.message);
  }

  return (
    (titleMatches || [])
      .map((service) => service as ServiceRecord)
      .find((service) => isSameArchivedServiceCandidate(service, requestData, providerIds, serviceData.title)) ||
    null
  );
}

async function findLinkedServiceForRequest(requestId: string) {
  const { data: linkedServices, error: linkedServiceError } = await supabaseAdmin
    .from('services')
    .select('id, title, status, provider_id, details')
    .contains('details', { provider_request_id: requestId })
    .limit(1);

  if (linkedServiceError) {
    throw new Error(linkedServiceError.message);
  }

  return (linkedServices?.[0] as ServiceRecord | undefined) || null;
}

async function ensureProviderProfile(requestData: ProviderRequest, customCommission: unknown) {
  const { data: existingProfileByRequestUserId } = requestData.user_id
    ? await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', requestData.user_id)
        .maybeSingle()
    : { data: null };

  const { data: existingProfileByEmail } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', requestData.email)
    .maybeSingle();

  let userId = existingProfileByRequestUserId?.id || existingProfileByEmail?.id || null;
  let tempPassword: string | null = null;

  if (!userId) {
    userId = await findAuthUserIdByEmail(requestData.email);
  }

  if (!userId) {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    tempPassword = `Sayyir@${randomNum}`;

    const { data: newUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: requestData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: requestData.name,
          is_provider: true,
        },
      });

    if (createUserError || !newUser.user) {
      throw new Error(createUserError?.message || 'Failed to create provider user');
    }

    userId = newUser.user.id;
  } else {
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          full_name: requestData.name,
          is_provider: true,
        },
      }
    );

    if (updateAuthError) {
      console.warn('Provider auth metadata update skipped:', updateAuthError.message);
    }
  }

  const profilePayload = {
    email: requestData.email,
    full_name: requestData.name,
    phone: requestData.phone ?? null,
    role: 'provider',
    is_provider: true,
    is_approved: true,
    is_admin: false,
    is_super_admin: false,
    is_banned: false,
    is_blocked: false,
    is_deleted: false,
    ...(customCommission !== undefined ? { custom_commission: customCommission } : {}),
    updated_at: new Date().toISOString(),
  };

  const { error: unbanAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
  });

  if (unbanAuthError) {
    throw new Error(unbanAuthError.message);
  }

  const { data: profileById, error: profileByIdError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (profileByIdError) {
    throw new Error(profileByIdError.message);
  }

  const { error: saveProfileError } = profileById
    ? await supabaseAdmin
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId)
    : await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          ...profilePayload,
          created_at: new Date().toISOString(),
        });

  if (saveProfileError) {
    throw new Error(saveProfileError.message);
  }

  return { userId, tempPassword };
}

async function ensureServiceForRequest(
  requestData: ProviderRequest,
  requestId: string,
  providerId: string
): Promise<ServiceResult> {
  const serviceData = extractServiceData(requestData, requestId);
  const archivedConflict = await findArchivedServiceConflict(requestData, requestId, [providerId]);

  if (archivedConflict) {
    return {
      blocked: true,
      code: 'service_archived_or_stopped_requires_manual_restore',
      service: archivedConflict,
    };
  }

  const { data: linkedServices, error: linkedServiceError } = await supabaseAdmin
    .from('services')
    .select('id, title, status, provider_id, details')
    .contains('details', { provider_request_id: requestId })
    .limit(1);

  if (linkedServiceError) {
    throw new Error(linkedServiceError.message);
  }

  if (linkedServices?.[0]) {
    const linkedService = linkedServices[0] as ServiceRecord;

    if (isArchivedServiceStatus(linkedService.status)) {
      return {
        blocked: true,
        code: 'service_archived_or_stopped_requires_manual_restore',
        service: linkedService,
      };
    }

    return { service: linkedService, created: false };
  }

  const { data: matchingServices, error: matchingServiceError } = await supabaseAdmin
    .from('services')
    .select('id, details, status')
    .eq('provider_id', providerId)
    .eq('title', serviceData.title)
    .limit(20);

  if (matchingServiceError) {
    throw new Error(matchingServiceError.message);
  }

  const archivedMatchingService = (matchingServices || []).find((service) =>
    isArchivedServiceStatus(service.status)
  ) as ServiceRecord | undefined;

  if (archivedMatchingService) {
    return {
      blocked: true,
      code: 'service_archived_or_stopped_requires_manual_restore',
      service: archivedMatchingService,
    };
  }

  const activeMatchingService = matchingServices?.[0] as ServiceRecord | undefined;

  if (activeMatchingService) {
    const existingDetails =
      activeMatchingService.details && typeof activeMatchingService.details === 'object'
        ? (activeMatchingService.details as JsonRecord)
        : {};

    const { error: linkExistingError } = await supabaseAdmin
      .from('services')
      .update({
        details: {
          ...existingDetails,
          provider_request_id: requestId,
        },
      })
      .eq('id', activeMatchingService.id);

    if (linkExistingError) {
      throw new Error(linkExistingError.message);
    }

    return { service: activeMatchingService, created: false };
  }

  const { data: newService, error: insertServiceError } = await supabaseAdmin
    .from('services')
    .insert({
      provider_id: providerId,
      ...serviceData,
      status: 'approved',
      pending_updates: null,
    })
    .select('id')
    .single();

  if (insertServiceError) {
    throw new Error(insertServiceError.message);
  }

  return { service: newService as ServiceRecord, created: true };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: Request) {
  try {
    const { requestId, requesterId, customCommission, forceCreateMissingService } = (await req.json()) as {
      requestId: string;
      requesterId: string;
      customCommission?: unknown;
      forceCreateMissingService?: boolean;
    };

    const permissionCheck = await checkAdminPermission(requesterId, 'requests_approve');
    if (!permissionCheck.success) {
      return NextResponse.json({ error: permissionCheck.message }, { status: 403 });
    }

    const { data: requestData, error: requestError } = await supabaseAdmin
      .from('provider_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !requestData) {
      return NextResponse.json({ error: 'Provider request not found' }, { status: 404 });
    }

    const providerRequest = requestData as ProviderRequest;
    const requestStatus = providerRequest.status;
    const isAlreadyApproved = requestStatus === 'approved';
    const isApprovalTransition = requestStatus === 'pending' || requestStatus === 'rejected';
    const canForceCreateMissingApprovedService =
      isAlreadyApproved && forceCreateMissingService === true;

    if (!isApprovalTransition && !isAlreadyApproved) {
      return NextResponse.json(
        {
          success: false,
          code: 'provider_request_status_not_approvable',
          message: 'Provider request must be pending, rejected, or already approved for manual review.',
        },
        { status: 400 }
      );
    }

    const existingProviderIds = await findExistingProviderIdsForRequest(providerRequest);
    const preflightArchivedConflict = await findArchivedServiceConflict(
      providerRequest,
      requestId,
      existingProviderIds
    );

    if (preflightArchivedConflict) {
      return NextResponse.json(
        {
          success: false,
          code: 'service_archived_or_stopped_requires_manual_restore',
          message: 'Service is stopped, deleted, or rejected and requires explicit admin restore.',
          serviceId: preflightArchivedConflict.id,
          serviceStatus: preflightArchivedConflict.status,
        },
        { status: 409 }
      );
    }

    if (isAlreadyApproved && !canForceCreateMissingApprovedService) {
      const linkedService = await findLinkedServiceForRequest(requestId);

      if (linkedService) {
        if (isArchivedServiceStatus(linkedService.status)) {
          return NextResponse.json(
            {
              success: false,
              code: 'service_archived_or_stopped_requires_manual_restore',
              message: 'Service is stopped, deleted, or rejected and requires explicit admin restore.',
              serviceId: linkedService.id,
              serviceStatus: linkedService.status,
            },
            { status: 409 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Provider request was already approved; service already exists.',
          serviceId: linkedService.id,
        });
      }

      return NextResponse.json(
        {
          success: false,
          code: 'approved_request_missing_service_needs_manual_review',
          message: 'Approved provider request is missing a linked service and needs manual review.',
        },
        { status: 409 }
      );
    }

    const { userId, tempPassword } = await ensureProviderProfile(providerRequest, customCommission);
    const serviceResult = await ensureServiceForRequest(providerRequest, requestId, userId);

    if (serviceResult.blocked) {
      return NextResponse.json(
        {
          success: false,
          code: serviceResult.code,
          message: 'Service is stopped, deleted, or rejected and requires explicit admin restore.',
          serviceId: serviceResult.service.id,
          serviceStatus: serviceResult.service.status,
        },
        { status: 409 }
      );
    }

    const { error: approveError } = await supabaseAdmin
      .from('provider_requests')
      .update({
        status: 'approved',
        approved_at: providerRequest.approved_at || new Date().toISOString(),
        user_id: userId,
      })
      .eq('id', requestId);

    if (approveError) {
      throw new Error(approveError.message);
    }

    if (isAlreadyApproved) {
      return NextResponse.json({
        success: true,
        message: serviceResult.created
          ? 'Provider request was already approved; missing service was created by explicit admin force.'
          : 'Provider request was already approved; service already exists.',
        serviceId: serviceResult.service?.id,
      });
    }

    const baseUrl =
      process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : (process.env.NEXT_PUBLIC_SITE_URL || 'https://sayyir.sa');

    const emailResponse = await fetch(`${baseUrl}/api/emails/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'provider_approved',
        email: providerRequest.email,
        phone: providerRequest.phone,
        providerName: providerRequest.name,
        password: tempPassword || 'Existing account',
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error('EMAIL SEND ERROR:', emailResult);
    }

    return NextResponse.json({
      success: true,
      message: 'Provider request approved successfully.',
      serviceId: serviceResult.service?.id,
      emailResult,
    });
  } catch (error: unknown) {
    console.error('APPROVE ERROR:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
