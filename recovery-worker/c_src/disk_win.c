#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "disk_win.h"

int c_list_drives(C_DriveInfo* out_drives, int max_drives) {
    char drive_strings[4096];
    DWORD len = GetLogicalDriveStringsA(sizeof(drive_strings), drive_strings);
    if (len == 0 || len > sizeof(drive_strings)) {
        return 0;
    }

    int count = 0;
    char* drive = drive_strings;

    while (*drive && count < max_drives) {
        UINT type = GetDriveTypeA(drive);

        if (type == DRIVE_FIXED || type == DRIVE_REMOVABLE) {
            C_DriveInfo info;
            memset(&info, 0, sizeof(C_DriveInfo));

            char drive_letter = drive[0];
            snprintf(info.path, sizeof(info.path), "\\\\.\\%c:", drive_letter);

            char volume_name[MAX_NAME_LEN] = {0};
            char fs_name[32] = {0};
            GetVolumeInformationA(
                drive,
                volume_name, sizeof(volume_name),
                NULL, NULL, NULL,
                fs_name, sizeof(fs_name)
            );

            if (strlen(volume_name) > 0) {
                snprintf(info.name, sizeof(info.name), "%s (%c:)", volume_name, drive_letter);
            } else {
                snprintf(info.name, sizeof(info.name), "Local Disk (%c:)", drive_letter);
            }

            ULARGE_INTEGER free_bytes, total_bytes, total_free_bytes;
            if (GetDiskFreeSpaceExA(drive, &free_bytes, &total_bytes, &total_free_bytes)) {
                info.capacity = total_bytes.QuadPart;
                info.free_space = free_bytes.QuadPart;
            } else {
                info.capacity = 0;
                info.free_space = 0;
            }

            strncpy(info.filesystem, fs_name, sizeof(info.filesystem) - 1);

            if (type == DRIVE_REMOVABLE) {
                strncpy(info.type, "USB", sizeof(info.type) - 1);
            } else {
                strncpy(info.type, "SSD", sizeof(info.type) - 1);
            }

            info.is_primary = (drive_letter == 'C' || drive_letter == 'c');

            out_drives[count] = info;
            count++;
        }

        drive += strlen(drive) + 1;
    }

    return count;
}

int c_read_sectors(const char* drive_path, uint64_t offset, uint32_t size, uint8_t* out_buffer) {
    HANDLE hDisk = CreateFileA(
        drive_path,
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        NULL,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (hDisk == INVALID_HANDLE_VALUE) {
        return (int)GetLastError();
    }

    LARGE_INTEGER liOffset;
    liOffset.QuadPart = offset;
    if (!SetFilePointerEx(hDisk, liOffset, NULL, FILE_BEGIN)) {
        DWORD err = GetLastError();
        CloseHandle(hDisk);
        return (int)err;
    }

    DWORD bytes_read = 0;
    if (!ReadFile(hDisk, out_buffer, (DWORD)size, &bytes_read, NULL)) {
        DWORD err = GetLastError();
        CloseHandle(hDisk);
        return (int)err;
    }

    CloseHandle(hDisk);
    return 0;
}
