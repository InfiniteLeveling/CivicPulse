import { listDepartments } from "@/services/department.service";
import { errorResponse, successResponse } from "@/utils/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/departments
 *
 * Department directory retrieval endpoint.
 *
 * Requirements:
 * - Publicly accessible for frontend selection dropdowns and display resolution.
 * - Returns approved department records deterministically sorted by name.
 * - Conceals internal administrative details.
 */
export async function GET() {
  try {
    const data = await listDepartments();
    return successResponse(
      {
        ...data,
        items: data.departments,
      },
      {
        status: 200,
        message: "Departments retrieved successfully",
      }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
